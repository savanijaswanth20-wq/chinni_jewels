import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
import app.models  # Register all SQLAlchemy models
from app.services.pricing_service import PricingService
from app.models.gold_rate import GoldRate

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed rate
    rate = GoldRate(purity="24K", rate_per_gram=9000.0, is_active=True)
    session.add(rate)
    session.commit()

    yield session
    session.close()

def test_gold_pricing_calculation(db_session):
    # Weight: 1g, Rate: 9000/g, Making: 300, GST: 3%
    # Gold Value = 9000
    # Subtotal = 9300
    # GST = 9300 * 0.03 = 279
    # Total = 9579
    pricing = PricingService.calculate_product_price(
        db=db_session,
        weight_grams=1.000,
        purity="24K",
        making_charge=300.0,
        gst_percentage=3.0
    )

    assert pricing["gold_value"] == 9000.0
    assert pricing["making_charges"] == 300.0
    assert pricing["gst_amount"] == 279.0
    assert pricing["total_price"] == 9579.0
