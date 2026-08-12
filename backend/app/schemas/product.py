from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProductImageSchema(BaseModel):
    id: str
    image_url: str
    alt_text: Optional[str] = None
    sort_order: int = 0
    is_primary: bool = False

    class Config:
        from_attributes = True

class PriceBreakdownSchema(BaseModel):
    gold_value: float
    making_charges: float
    gst_amount: float
    total_price: float
    gold_rate_used: float
    purity: str

class ProductCreateRequest(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = None
    sku: str
    purity: str = "24K"
    weight_grams: float = 1.000
    making_charge: float = 280.0
    gst_percentage: float = 3.0
    stock_quantity: int = 10
    low_stock_threshold: int = 5
    is_featured: bool = False
    image_urls: Optional[List[str]] = []

class ProductUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    purity: Optional[str] = None
    weight_grams: Optional[float] = None
    making_charge: Optional[float] = None
    gst_percentage: Optional[float] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: str
    category_id: str
    category_name: Optional[str] = None
    name: str
    slug: str
    description: Optional[str] = None
    sku: str
    purity: str
    weight_grams: float
    making_charge: float
    gst_percentage: float
    base_price: float
    selling_price: float
    stock_quantity: int
    low_stock_threshold: int
    is_featured: bool
    is_active: bool
    images: List[ProductImageSchema] = []
    price_breakdown: Optional[PriceBreakdownSchema] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
