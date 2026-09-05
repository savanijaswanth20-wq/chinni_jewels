from datetime import datetime, date, time, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import require_role
from app.models.order import Order
from app.models.product import Product
from app.models.profile import Profile, UserRole
from app.models.inventory import Inventory
from app.services.inventory_service import InventoryService
from app.utils.response import success_response

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

@router.get("/dashboard")
def get_admin_dashboard(user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    today = date.today()
    start_of_today = datetime.combine(today, time.min)
    end_of_today = datetime.combine(today, time.max)

    # Sales today (handles cross-database timestamp comparison reliably)
    today_orders = db.query(Order).filter(
        Order.created_at >= start_of_today,
        Order.created_at <= end_of_today,
        Order.order_status != "CANCELLED"
    ).all()
    today_sales = sum(o.total_amount for o in today_orders)
    today_orders_count = len(today_orders)

    # Order counts
    pending_orders_count = db.query(Order).filter(Order.order_status == "PENDING").count()
    completed_orders_count = db.query(Order).filter(Order.order_status == "DELIVERED").count()

    # Customer & Product counts
    total_customers_count = db.query(Profile).filter(Profile.role == UserRole.CUSTOMER.value).count()
    total_products_count = db.query(Product).filter(Product.is_active == True).count()

    # Inventory metrics
    inventories = db.query(Inventory).all()
    low_stock_count = sum(1 for inv in inventories if InventoryService.get_stock_status(inv) == "LOW_STOCK")
    out_of_stock_count = sum(1 for inv in inventories if InventoryService.get_stock_status(inv) == "OUT_OF_STOCK")

    products = db.query(Product).filter(Product.is_active == True).all()
    total_vault_grams = sum(
        p.weight_grams * (p.inventory.available_quantity if p.inventory else (p.stock_quantity or 0))
        for p in products
    )
    total_stock_val = sum(
        (p.selling_price if p.selling_price > 0 else (p.price if p.price > 0 else 0.0)) *
        (p.inventory.available_quantity if p.inventory else (p.stock_quantity or 0))
        for p in products
    )

    return success_response({
        "today_sales": round(today_sales, 2),
        "today_orders_count": today_orders_count,
        "pending_orders_count": pending_orders_count,
        "completed_orders_count": completed_orders_count,
        "total_customers_count": total_customers_count,
        "total_products_count": total_products_count,
        "low_stock_products_count": low_stock_count,
        "out_of_stock_products_count": out_of_stock_count,
        "total_vault_stock_grams": round(total_vault_grams, 3),
        "total_stock_value": round(total_stock_val, 2)
    })

from fastapi import File, UploadFile, Request
from app.services.storage_service import StorageService

@router.post("/upload-image")
async def upload_admin_image(request: Request, file: UploadFile = File(...)):
    content = await file.read()
    result = await StorageService.upload_image(
        content=content,
        filename=file.filename or "image.jpg",
        content_type=file.content_type
    )
    return success_response(result)


