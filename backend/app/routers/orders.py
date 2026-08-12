from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role, get_current_user_optional
from app.models.order import Order
from app.schemas.order import OrderCreateRequest, OrderStatusUpdateRequest
from app.services.order_service import OrderService
from app.services.whatsapp_service import WhatsAppService
from app.utils.response import success_response

router = APIRouter(prefix="/orders", tags=["Orders"])

def build_order_dto(o: Order) -> dict:
    items_dto = [{
        "id": item.id,
        "product_id": item.product_id,
        "product_name": item.product_name,
        "product_image_url": getattr(item, "product_image_url", None),
        "sku": item.sku,
        "weight_grams": item.weight_grams,
        "purity": item.purity,
        "quantity": item.quantity,
        "gold_rate": getattr(item, "gold_rate", item.unit_price),
        "gold_value": getattr(item, "gold_value", item.unit_price * item.quantity),
        "unit_price": item.unit_price,
        "making_charge": item.making_charge,
        "gst": item.gst,
        "total_price": item.total_price
    } for item in o.items]

    wa_message = getattr(o, 'whatsapp_message', None) or WhatsAppService.generate_order_message(o)
    wa_url = getattr(o, 'whatsapp_url', None) or WhatsAppService.generate_whatsapp_url(wa_message)

    payment_pref = getattr(o, 'payment_preference', None) or getattr(o, 'payment_method', 'UPI')

    return {
        "id": o.id,
        "order_number": o.order_number,
        "customer_id": o.customer_id,
        "customer_name": o.customer_name,
        "phone": o.phone,
        "email": o.email,
        "address": o.address,
        "city": o.city,
        "state": o.state,
        "pincode": o.pincode,
        "subtotal": o.subtotal,
        "making_charges": o.making_charges,
        "gst": o.gst,
        "discount": o.discount,
        "total_amount": o.total_amount,
        "payment_method": o.payment_method,
        "payment_preference": payment_pref,
        "payment_status": o.payment_status,
        "order_status": o.order_status,
        "whatsapp_status": o.whatsapp_status,
        "whatsapp_url": wa_url,
        "whatsapp_message": wa_message,
        "notes": o.notes,
        "items": items_dto,
        "created_at": o.created_at,
        "updated_at": o.updated_at
    }

@router.post("")
def create_order(req: OrderCreateRequest, db: Session = Depends(get_db), current_user_id: Optional[str] = Depends(get_current_user_optional)):
    new_order = OrderService.create_order(db=db, order_data=req, customer_id=current_user_id)
    return success_response(build_order_dto(new_order))

@router.get("")
def list_orders(status_filter: Optional[str] = Query(None), user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.order_status == status_filter)

    orders = query.order_by(Order.created_at.desc()).all()
    return success_response([build_order_dto(o) for o in orders])

@router.get("/{id_or_number}")
def get_order(id_or_number: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        (Order.id == id_or_number) | (Order.order_number == id_or_number)
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return success_response(build_order_dto(order))

@router.put("/{order_id}/status")
def update_order_status(order_id: str, req: OrderStatusUpdateRequest, user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    user_id = user.get("sub") if user else None
    updated = OrderService.update_order_status(db=db, order_id=order_id, new_status=req.order_status, user_id=user_id)
    return success_response(build_order_dto(updated))

@router.post("/{order_id}/cancel")
def cancel_order(order_id: str, db: Session = Depends(get_db)):
    updated = OrderService.update_order_status(db=db, order_id=order_id, new_status="CANCELLED")
    return success_response(build_order_dto(updated))
