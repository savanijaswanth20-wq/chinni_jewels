from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.inventory import Inventory, InventoryTransaction, TransactionType
from app.models.product import Product
from app.models.audit import AuditLog

class InventoryService:
    @staticmethod
    def get_or_create_inventory(db: Session, product_id: str, default_stock: int = 10) -> Inventory:
        inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
        if not inv:
            inv = Inventory(
                product_id=product_id,
                available_quantity=default_stock,
                reserved_quantity=0,
                sold_quantity=0,
                damaged_quantity=0,
                low_stock_threshold=5
            )
            db.add(inv)
            db.commit()
            db.refresh(inv)
        return inv

    @staticmethod
    def get_stock_status(inventory: Inventory) -> str:
        if inventory.available_quantity <= 0:
            return "OUT_OF_STOCK"
        elif inventory.available_quantity <= inventory.low_stock_threshold:
            return "LOW_STOCK"
        return "IN_STOCK"

    @staticmethod
    def adjust_stock(db: Session, product_id: str, quantity: int, reason: str, transaction_type: str = "ADJUSTMENT", user_id: str = None) -> Inventory:
        """Atomic stock adjustment with transaction audit log."""
        inv = db.query(Inventory).filter(Inventory.product_id == product_id).with_for_update().first()
        if not inv:
            inv = InventoryService.get_or_create_inventory(db, product_id, default_stock=0)

        prev_stock = inv.available_quantity
        new_stock = prev_stock + quantity

        if new_stock < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock cannot be reduced below zero. Current stock: {prev_stock}, requested reduction: {abs(quantity)}"
            )

        inv.available_quantity = new_stock

        # Update product stock_quantity field
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            product.stock_quantity = new_stock

        # Record inventory transaction
        tx = InventoryTransaction(
            product_id=product_id,
            transaction_type=transaction_type,
            quantity=quantity,
            previous_stock=prev_stock,
            new_stock=new_stock,
            reason=reason,
            created_by=user_id
        )
        db.add(tx)

        # Record audit log
        audit = AuditLog(
            user_id=user_id,
            action="STOCK_ADJUSTMENT",
            entity_type="INVENTORY",
            entity_id=inv.id,
            old_value=str(prev_stock),
            new_value=str(new_stock)
        )
        db.add(audit)

        db.commit()
        db.refresh(inv)
        return inv

    @staticmethod
    def reserve_stock(db: Session, product_id: str, quantity: int, order_id: str) -> bool:
        """Reserve stock during order creation (AVAILABLE -> RESERVED)."""
        inv = db.query(Inventory).filter(Inventory.product_id == product_id).with_for_update().first()
        if not inv:
            inv = InventoryService.get_or_create_inventory(db, product_id, default_stock=0)

        if inv.available_quantity < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient available stock for product ID {product_id}. Available: {inv.available_quantity}, Requested: {quantity}"
            )

        prev_stock = inv.available_quantity
        inv.available_quantity -= quantity
        inv.reserved_quantity += quantity

        # Update product
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            product.stock_quantity = inv.available_quantity

        tx = InventoryTransaction(
            product_id=product_id,
            transaction_type=TransactionType.RESERVATION.value,
            quantity=quantity,
            previous_stock=prev_stock,
            new_stock=inv.available_quantity,
            reference_type="ORDER",
            reference_id=order_id,
            reason=f"Stock reserved for Order {order_id}"
        )
        db.add(tx)
        return True

    @staticmethod
    def confirm_sale_stock(db: Session, product_id: str, quantity: int, order_id: str):
        """Convert reserved stock to sold stock (RESERVED -> SOLD)."""
        inv = db.query(Inventory).filter(Inventory.product_id == product_id).with_for_update().first()
        if inv and inv.reserved_quantity >= quantity:
            inv.reserved_quantity -= quantity
            inv.sold_quantity += quantity

            tx = InventoryTransaction(
                product_id=product_id,
                transaction_type=TransactionType.SALE.value,
                quantity=quantity,
                previous_stock=inv.available_quantity + quantity,
                new_stock=inv.available_quantity,
                reference_type="ORDER",
                reference_id=order_id,
                reason=f"Sale confirmed for Order {order_id}"
            )
            db.add(tx)

    @staticmethod
    def release_reserved_stock(db: Session, product_id: str, quantity: int, order_id: str):
        """Release reserved stock on order cancellation (RESERVED -> AVAILABLE)."""
        inv = db.query(Inventory).filter(Inventory.product_id == product_id).with_for_update().first()
        if inv and inv.reserved_quantity >= quantity:
            inv.reserved_quantity -= quantity
            inv.available_quantity += quantity

            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                product.stock_quantity = inv.available_quantity

            tx = InventoryTransaction(
                product_id=product_id,
                transaction_type=TransactionType.RELEASE.value,
                quantity=quantity,
                previous_stock=inv.available_quantity - quantity,
                new_stock=inv.available_quantity,
                reference_type="ORDER",
                reference_id=order_id,
                reason=f"Reserved stock released for cancelled Order {order_id}"
            )
            db.add(tx)
