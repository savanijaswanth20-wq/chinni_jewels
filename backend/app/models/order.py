import uuid
from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin
import enum

class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PROCESSING = "PROCESSING"
    PACKED = "PACKED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    RETURNED = "RETURNED"

class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_number = Column(String, unique=True, index=True, nullable=False)  # G1G-YYYYMMDD-XXXX
    customer_id = Column(String, ForeignKey("profiles.id"), index=True, nullable=True)
    customer_name = Column(String, nullable=False)
    phone = Column(String, index=True, nullable=False)
    email = Column(String, nullable=True)
    address = Column(Text, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    pincode = Column(String, nullable=False)

    subtotal = Column(Float, nullable=False, default=0.0)
    making_charges = Column(Float, nullable=False, default=0.0)
    gst = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)

    payment_method = Column(String, default="WHATSAPP_COD")
    payment_preference = Column(String, default="UPI", nullable=False)
    payment_status = Column(String, default="PENDING")  # PENDING, PAID, REFUNDED
    order_status = Column(String, default=OrderStatus.PENDING.value, nullable=False)
    whatsapp_status = Column(String, default="GENERATED")
    notes = Column(Text, nullable=True)

    customer = relationship("Profile", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    returns = relationship("ReturnItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    product_name = Column(String, nullable=False)        # Snapshot
    product_image_url = Column(String, nullable=True)    # Snapshot
    sku = Column(String, nullable=False)                 # Snapshot
    weight_grams = Column(Float, nullable=False)         # Snapshot
    purity = Column(String, nullable=False)               # Snapshot
    quantity = Column(Integer, nullable=False, default=1)
    gold_rate = Column(Float, nullable=False, default=0.0) # Snapshot
    gold_value = Column(Float, nullable=False, default=0.0)# Snapshot
    unit_price = Column(Float, nullable=False)           # Snapshot (Gold Rate per gram)
    making_charge = Column(Float, nullable=False)        # Snapshot
    gst = Column(Float, nullable=False)                  # Snapshot
    total_price = Column(Float, nullable=False)          # Snapshot

    order = relationship("Order", back_populates="items")
