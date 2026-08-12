from pydantic import BaseModel
from typing import List, Optional

class DashboardSummaryResponse(BaseModel):
    today_sales: float
    today_orders_count: int
    pending_orders_count: int
    completed_orders_count: int
    total_customers_count: int
    total_products_count: int
    low_stock_products_count: int
    out_of_stock_products_count: int
    total_vault_stock_grams: float
    total_stock_value: float

class CategoryCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
