import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from app.core.database import Base
import app.models  # Register all SQLAlchemy models
from app.models.category import Category
from app.models.product import Product
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
        name="Test Coin",
        slug="test-coin",
        sku="TEST-01",
        purity="24K",
        weight_grams=1.0,
        making_charge=280.0,
        stock_quantity=10
    )
    session.add(prod)
    session.commit()

    InventoryService.get_or_create_inventory(session, prod.id, default_stock=10)

    yield session, prod.id
    session.close()

def test_stock_reservation_and_oversell_prevention(db_session):
    session, prod_id = db_session

    # Reserve 6 units
    success = InventoryService.reserve_stock(session, prod_id, quantity=6, order_id="ORD-1")
    assert success is True

    inv = InventoryService.get_or_create_inventory(session, prod_id)
    assert inv.available_quantity == 4
    assert inv.reserved_quantity == 6

    # Attempt to reserve 5 units (only 4 available) -> Should raise HTTPException
    with pytest.raises(HTTPException):
        InventoryService.reserve_stock(session, prod_id, quantity=5, order_id="ORD-2")

def test_stock_release_on_cancellation(db_session):
    session, prod_id = db_session

    InventoryService.reserve_stock(session, prod_id, quantity=4, order_id="ORD-1")
    InventoryService.release_reserved_stock(session, prod_id, quantity=4, order_id="ORD-1")

    inv = InventoryService.get_or_create_inventory(session, prod_id)
    assert inv.available_quantity == 10
    assert inv.reserved_quantity == 0
