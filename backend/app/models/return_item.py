import uuid
from sqlalchemy import Column, String, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin
import enum

class ReturnStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"

class ReturnItem(Base, TimestampMixin):
    __tablename__ = "returns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    reason = Column(String, nullable=False)
    status = Column(String, default=ReturnStatus.REQUESTED.value, nullable=False)
    refund_amount = Column(Float, nullable=False, default=0.0)

    order = relationship("Order", back_populates="returns")
