from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import require_role
from app.models.profile import Profile, UserRole
from app.models.order import Order
from app.utils.response import success_response

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("")
def list_customers(search: Optional[str] = Query(None), user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    query = db.query(Profile).filter(Profile.role == UserRole.CUSTOMER.value)

    if search:
        s = f"%{search}%"
        query = query.filter(
            (Profile.full_name.like(s)) | (Profile.phone.like(s)) | (Profile.email.like(s))
        )

    customers = query.order_by(Profile.created_at.desc()).all()

    result = []
    for c in customers:
        # Calculate stats
        orders = db.query(Order).filter(
            (Order.customer_id == c.id) | (Order.phone == c.phone)
        ).all()

        total_spent = sum(o.total_amount for o in orders if o.order_status != "CANCELLED")
        last_order = orders[0].created_at if orders else None

        result.append({
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "phone": c.phone,
            "is_active": c.is_active,
            "total_orders": len(orders),
            "total_spent": round(total_spent, 2),
            "last_order_date": last_order,
            "created_at": c.created_at
        })

    return success_response(result)

@router.get("/{customer_id}")
def get_customer(customer_id: str, user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    customer = db.query(Profile).filter(Profile.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    orders = db.query(Order).filter(
        (Order.customer_id == customer.id) | (Order.phone == customer.phone)
    ).all()

    return success_response({
        "id": customer.id,
        "full_name": customer.full_name,
        "email": customer.email,
        "phone": customer.phone,
        "is_active": customer.is_active,
        "total_orders": len(orders),
        "total_spent": sum(o.total_amount for o in orders if o.order_status != "CANCELLED"),
        "created_at": customer.created_at
    })
