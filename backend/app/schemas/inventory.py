from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StockAdjustmentRequest(BaseModel):
    product_id: str
    quantity: int  # Positive for addition, negative for reduction
    reason: str
    transaction_type: str = "ADJUSTMENT"  # STOCK_IN, DAMAGE, ADJUSTMENT

class InventoryResponse(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    sku: Optional[str] = None
    available_quantity: int
    reserved_quantity: int
    sold_quantity: int
    damaged_quantity: int
    low_stock_threshold: int
    status: str  # IN_STOCK, LOW_STOCK, OUT_OF_STOCK
    updated_at: datetime

    class Config:
        from_attributes = True

class InventoryTransactionResponse(BaseModel):
    id: str
    product_id: str
    transaction_type: str
    quantity: int
    previous_stock: int
    new_stock: int
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
