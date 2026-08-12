from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.inventory import Inventory, InventoryTransaction
from app.schemas.inventory import StockAdjustmentRequest
from app.services.inventory_service import InventoryService
from app.utils.response import success_response

router = APIRouter(prefix="/inventory", tags=["Inventory"])

def build_inventory_dto(inv: Inventory) -> dict:
    return {
        "id": inv.id,
        "product_id": inv.product_id,
        "product_name": inv.product.name if inv.product else None,
        "sku": inv.product.sku if inv.product else None,
        "available_quantity": inv.available_quantity,
        "reserved_quantity": inv.reserved_quantity,
        "sold_quantity": inv.sold_quantity,
        "damaged_quantity": inv.damaged_quantity,
        "low_stock_threshold": inv.low_stock_threshold,
        "status": InventoryService.get_stock_status(inv)
    }

@router.get("")
def list_inventory(user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    inventories = db.query(Inventory).all()
    return success_response([build_inventory_dto(inv) for inv in inventories])

@router.get("/low-stock")
def list_low_stock(user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    inventories = db.query(Inventory).all()
    low_stock = [build_inventory_dto(inv) for inv in inventories if InventoryService.get_stock_status(inv) == "LOW_STOCK"]
    return success_response(low_stock)

@router.get("/out-of-stock")
def list_out_of_stock(user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    inventories = db.query(Inventory).all()
    out_of_stock = [build_inventory_dto(inv) for inv in inventories if InventoryService.get_stock_status(inv) == "OUT_OF_STOCK"]
    return success_response(out_of_stock)

@router.post("/adjust")
def adjust_stock(req: StockAdjustmentRequest, user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    user_id = user.get("sub") if user else None
    inv = InventoryService.adjust_stock(
        db=db,
        product_id=req.product_id,
        quantity=req.quantity,
        reason=req.reason,
        transaction_type=req.transaction_type,
        user_id=user_id
    )
    return success_response(build_inventory_dto(inv))

@router.get("/transactions/{product_id}")
def get_inventory_transactions(product_id: str, user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    txs = db.query(InventoryTransaction).filter(
        InventoryTransaction.product_id == product_id
    ).order_by(InventoryTransaction.created_at.desc()).all()

    return success_response([{
        "id": tx.id,
        "product_id": tx.product_id,
        "transaction_type": tx.transaction_type,
        "quantity": tx.quantity,
        "previous_stock": tx.previous_stock,
        "new_stock": tx.new_stock,
        "reference_type": tx.reference_type,
        "reference_id": tx.reference_id,
        "reason": tx.reason,
        "created_at": tx.created_at
    } for tx in txs])
