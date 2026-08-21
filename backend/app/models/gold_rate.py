import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime
from app.core.database import Base
from app.models.base import TimestampMixin

class GoldRate(Base, TimestampMixin):
    __tablename__ = "gold_rates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    purity = Column(String, nullable=False, index=True)  # e.g., "24K", "22K", "18K"
    rate_per_gram = Column(Float, nullable=False)
    effective_from = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    effective_to = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(String, nullable=True)
