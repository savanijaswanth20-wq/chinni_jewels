from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class GoldRateCreateRequest(BaseModel):
    purity: str = "24K"  # e.g., "24K", "22K", "18K"
    rate_per_gram: float

class GoldRateResponse(BaseModel):
    id: str
    purity: str
    rate_per_gram: float
    effective_from: datetime
    effective_to: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
