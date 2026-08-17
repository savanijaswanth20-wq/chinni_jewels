from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

class OrderItemCreateRequest(BaseModel):
    product_id: str
    quantity: int = 1

class OrderCreateRequest(BaseModel):
    customer_name: str
    phone: str
    email: Optional[EmailStr] = None
    address: str
    city: str
    state: str
    pincode: str
    items: List[OrderItemCreateRequest]
    payment_method: str = "WHATSAPP_COD"
    payment_preference: Optional[str] = "UPI"
    notes: Optional[str] = None

class OrderStatusUpdateRequest(BaseModel):
    order_status: str  # PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, DELIVERED, CANCELLED
    notes: Optional[str] = None

class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_id: str
    product_name: str
    product_image_url: Optional[str] = None
    sku: str
    weight_grams: float
    purity: str
    quantity: int
    gold_rate: float = 0.0
    gold_value: float = 0.0
    unit_price: float
    making_charge: float
    gst: float
    total_price: float

class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_number: str
    customer_name: str
    phone: str
    email: Optional[str] = None
    address: str
    city: str
    state: str
    pincode: str
    subtotal: float
    making_charges: float
    gst: float
    discount: float
    total_amount: float
    payment_method: str
    payment_preference: Optional[str] = "UPI"
    payment_status: str
    order_status: str
    whatsapp_status: str
    whatsapp_url: Optional[str] = None
    whatsapp_message: Optional[str] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime

