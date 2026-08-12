import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
import app.models  # Register all SQLAlchemy models
from app.models.category import Category
from app.models.product import Product
from app.schemas.order import OrderCreateRequest, OrderItemCreateRequest
from app.services.order_service import OrderService
from app.services.inventory_service import InventoryService

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    cat = Category(name="Coins", slug="coins")
    session.add(cat)
    session.commit()

    prod = Product(
        category_id=cat.id,
        name="Test 1g Gold Coin",
        slug="test-coin",
        sku="TEST-COIN-01",
        purity="24K",
        weight_grams=1.0,
        making_charge=280.0,
        stock_quantity=20
    )
    session.add(prod)
    session.commit()

    InventoryService.get_or_create_inventory(session, prod.id, default_stock=20)

    yield session, prod.id
    session.close()

def test_order_creation_and_whatsapp_payload(db_session):
    session, prod_id = db_session

    req = OrderCreateRequest(
        customer_name="Test Customer",
        phone="+919876543210",
        address="123 Gold Street",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        items=[OrderItemCreateRequest(product_id=prod_id, quantity=2)]
    )

    order = OrderService.create_order(session, req)

    assert order.order_number.startswith("G1G-")
    assert order.total_amount > 0
    assert len(order.items) == 1
    assert order.items[0].quantity == 2
    assert "https://wa.me/" in order.whatsapp_url

    # Check stock reservation
    inv = InventoryService.get_or_create_inventory(session, prod_id)
    assert inv.available_quantity == 18
    assert inv.reserved_quantity == 2
