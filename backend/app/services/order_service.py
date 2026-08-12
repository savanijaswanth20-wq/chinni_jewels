import random
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.profile import Profile
from app.schemas.order import OrderCreateRequest
from app.services.inventory_service import InventoryService
from app.services.pricing_service import PricingService
from app.services.whatsapp_service import WhatsAppService
from app.models.audit import AuditLog

class OrderService:
    @staticmethod
    def generate_order_number() -> str:
        date_str = datetime.utcnow().strftime("%Y%m%d")
        rand_suffix = str(random.randint(1000, 9999))
        return f"G1G-{date_str}-{rand_suffix}"

    @staticmethod
    def create_order(db: Session, order_data: OrderCreateRequest, customer_id: str = None) -> Order:
        """
        Transactional order creation:
        1. Validate items & stock
        2. Calculate current prices & snapshots
        3. Reserve stock atomically
        4. Create Order & OrderItem records
        5. Generate WhatsApp link
        """
        if not order_data.items:
            raise HTTPException(status_code=400, detail="Order must contain at least one item.")

        order_number = OrderService.generate_order_number()
        
        subtotal = 0.0
        making_total = 0.0
        gst_total = 0.0
        order_items_to_create = []
        items_summary_lines = []

        # 1 & 2: Process items
        for item_req in order_data.items:
            product = db.query(Product).filter(Product.id == item_req.product_id, Product.is_active == True).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product ID {item_req.product_id} not found.")

            # Calculate price using current pricing engine
            pricing = PricingService.calculate_product_price(
                db=db,
                weight_grams=product.weight_grams,
                purity=product.purity,
                making_charge=product.making_charge,
                gst_percentage=product.gst_percentage
            )

            gold_rate = pricing["gold_rate_used"]
            gold_val = pricing["gold_value"] * item_req.quantity
            item_making = pricing["making_charges"]
            item_gst = pricing["gst_amount"]
            item_total = pricing["total_price"] * item_req.quantity

            subtotal += pricing["gold_value"] * item_req.quantity
            making_total += item_making * item_req.quantity
            gst_total += item_gst * item_req.quantity

            img_url = getattr(product, "primary_image_url", "assets/hero_gold_coin.png")

            # Create OrderItem snapshot
            order_item = OrderItem(
                product_id=product.id,
                product_name=product.name,
                product_image_url=img_url,
                sku=product.sku,
                weight_grams=product.weight_grams,
                purity=product.purity,
                quantity=item_req.quantity,
                gold_rate=gold_rate,
                gold_value=gold_val,
                unit_price=gold_rate,
                making_charge=item_making,
                gst=item_gst,
                total_price=item_total
            )
            order_items_to_create.append((order_item, product.id, item_req.quantity))

        grand_total = round(subtotal + making_total + gst_total, 2)
        payment_pref = getattr(order_data, 'payment_preference', None) or order_data.payment_method or "UPI"

        # 3. Create master Order
        new_order = Order(
            order_number=order_number,
            customer_id=customer_id,
            customer_name=order_data.customer_name,
            phone=order_data.phone,
            email=order_data.email,
            address=order_data.address,
            city=order_data.city,
            state=order_data.state,
            pincode=order_data.pincode,
            subtotal=round(subtotal, 2),
            making_charges=round(making_total, 2),
            gst=round(gst_total, 2),
            discount=0.0,
            total_amount=grand_total,
            payment_method=order_data.payment_method,
            payment_preference=payment_pref,
            payment_status="PENDING",
            order_status=OrderStatus.PENDING.value,
            whatsapp_status="GENERATED",
            notes=order_data.notes
        )
        db.add(new_order)
        db.flush()  # Assign order ID

        # 4. Reserve stock & link items atomically
        for oi, prod_id, qty in order_items_to_create:
            oi.order_id = new_order.id
            db.add(oi)
            # Atomic reservation (AVAILABLE -> RESERVED)
            InventoryService.reserve_stock(db=db, product_id=prod_id, quantity=qty, order_id=new_order.id)

        db.commit()
        db.refresh(new_order)

        # 5. Generate WhatsApp payload & trigger Layer 2 Cloud API
        wa_message = WhatsAppService.generate_order_message(new_order)
        wa_url = WhatsAppService.generate_whatsapp_url(wa_message)
        WhatsAppService.send_whatsapp_order(new_order)

        # Attach dynamic WhatsApp URL & Message properties
        new_order.whatsapp_url = wa_url
        new_order.whatsapp_message = wa_message

        return new_order

    @staticmethod
    def update_order_status(db: Session, order_id: str, new_status: str, user_id: str = None) -> Order:
        """Valid status transitions and stock movements."""
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        current = order.order_status
        
        # Valid state transitions
        valid_transitions = {
            OrderStatus.PENDING.value: [OrderStatus.CONFIRMED.value, OrderStatus.CANCELLED.value],
            OrderStatus.CONFIRMED.value: [OrderStatus.PROCESSING.value, OrderStatus.CANCELLED.value],
            OrderStatus.PROCESSING.value: [OrderStatus.PACKED.value, OrderStatus.CANCELLED.value],
            OrderStatus.PACKED.value: [OrderStatus.SHIPPED.value, OrderStatus.CANCELLED.value],
            OrderStatus.SHIPPED.value: [OrderStatus.DELIVERED.value, OrderStatus.RETURNED.value],
            OrderStatus.DELIVERED.value: [OrderStatus.RETURNED.value],
            OrderStatus.CANCELLED.value: [],
            OrderStatus.RETURNED.value: []
        }

        allowed = valid_transitions.get(current, [])
        if new_status not in allowed and new_status != current:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid order status transition from '{current}' to '{new_status}'. Allowed: {allowed}"
            )

        # Execute stock state transitions
        if new_status in [OrderStatus.CONFIRMED.value, OrderStatus.DELIVERED.value] and current == OrderStatus.PENDING.value:
            for item in order.items:
                InventoryService.confirm_sale_stock(db, item.product_id, item.quantity, order.id)

        elif new_status == OrderStatus.CANCELLED.value and current in [OrderStatus.PENDING.value, OrderStatus.CONFIRMED.value, OrderStatus.PROCESSING.value]:
            for item in order.items:
                InventoryService.release_reserved_stock(db, item.product_id, item.quantity, order.id)

        order.order_status = new_status
        
        # Audit log
        audit = AuditLog(
            user_id=user_id,
            action="UPDATE_ORDER_STATUS",
            entity_type="ORDER",
            entity_id=order.id,
            old_value=current,
            new_value=new_status
        )
        db.add(audit)
        db.commit()
        db.refresh(order)
        return order
