import re
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.profile import Profile, UserRole
from app.models.category import Category
from app.models.product import Product, ProductImage
from app.models.gold_rate import GoldRate
from app.models.inventory import Inventory
from app.core.security import get_password_hash
from app.services.pricing_service import PricingService

def slugify(text: str) -> str:
    return re.sub(r'[\W_]+', '-', text.lower()).strip('-')

def seed_database(db: Session):
    Base.metadata.create_all(bind=engine)

    # 1. Seed Admin User
    admin = db.query(Profile).filter(Profile.email == "admin@cninni.com").first()
    if not admin:
        admin = Profile(
            full_name="CNINNI Admin",
            email="admin@cninni.com",
            phone="+919876543210",
            hashed_password=get_password_hash("AdminSecret2026!"),
            role=UserRole.ADMIN.value,
            is_active=True
        )
        db.add(admin)

    # 2. Seed Gold Rates
    rates_data = [
        {"purity": "24K", "rate": 9240.0},
        {"purity": "22K", "rate": 8470.0},
        {"purity": "18K", "rate": 6930.0}
    ]
    for r in rates_data:
        existing = db.query(GoldRate).filter(GoldRate.purity == r["purity"], GoldRate.is_active == True).first()
        if not existing:
            gr = GoldRate(purity=r["purity"], rate_per_gram=r["rate"], is_active=True)
            db.add(gr)

    db.commit()

    # 3. Seed Categories
    cat_names = ["Gold Coins", "Gold Bars", "Gold Jewellery", "Gold Gifts"]
    cat_map = {}
    for name in cat_names:
        slug = slugify(name)
        cat = db.query(Category).filter(Category.slug == slug).first()
        if not cat:
            cat = Category(name=name, slug=slug, description=f"Certified {name} collection")
            db.add(cat)
            db.commit()
            db.refresh(cat)
        cat_map[name] = cat.id

    # 4. Seed Products
    products_seed = [
        {
            "name": "Signature Gold Coin",
            "sku": "CN-24K-C01",
            "cat": "Gold Coins",
            "purity": "24K",
            "weight": 1.000,
            "making": 280.0,
            "stock": 42,
            "image": "assets/hero_gold_coin.png",
            "featured": True
        },
        {
            "name": "Lakshmi Embossed Gold Coin",
            "sku": "CN-24K-C02",
            "cat": "Gold Coins",
            "purity": "24K",
            "weight": 1.000,
            "making": 310.0,
            "stock": 18,
            "image": "assets/featured_product.png",
            "featured": True
        },
        {
            "name": "Swiss Minted Gold Bar",
            "sku": "CN-24K-B01",
            "cat": "Gold Bars",
            "purity": "24K",
            "weight": 1.000,
            "making": 380.0,
            "stock": 12,
            "image": "assets/product_gold_bar.png",
            "featured": False
        },
        {
            "name": "Filigree Gold Pendant",
            "sku": "CN-24K-P01",
            "cat": "Gold Jewellery",
            "purity": "24K",
            "weight": 1.000,
            "making": 440.0,
            "stock": 8,
            "image": "assets/product_gold_pendant.png",
            "featured": True
        },
        {
            "name": "Classic Gold Bangle",
            "sku": "CN-22K-J01",
            "cat": "Gold Jewellery",
            "purity": "22K",
            "weight": 1.000,
            "making": 280.0,
            "stock": 15,
            "image": "assets/product_gold_bangle.png",
            "featured": False
        },
        {
            "name": "Velvet Box Gold Gift Set",
            "sku": "CN-24K-G01",
            "cat": "Gold Gifts",
            "purity": "24K",
            "weight": 1.000,
            "making": 580.0,
            "stock": 25,
            "image": "assets/product_gold_gift.png",
            "featured": True
        }
    ]

    for ps in products_seed:
        existing = db.query(Product).filter(Product.sku == ps["sku"]).first()
        if not existing:
            pricing = PricingService.calculate_product_price(
                db=db, weight_grams=ps["weight"], purity=ps["purity"], making_charge=ps["making"]
            )
            p = Product(
                category_id=cat_map[ps["cat"]],
                name=ps["name"],
                slug=slugify(ps["name"]),
                sku=ps["sku"],
                purity=ps["purity"],
                weight_grams=ps["weight"],
                making_charge=ps["making"],
                gst_percentage=3.0,
                base_price=pricing["gold_value"],
                selling_price=pricing["total_price"],
                stock_quantity=ps["stock"],
                low_stock_threshold=5,
                is_featured=ps["featured"]
            )
            db.add(p)
            db.flush()

            # Attach Image
            img = ProductImage(product_id=p.id, image_url=ps["image"], is_primary=True)
            db.add(img)

            # Create Inventory
            inv = Inventory(
                product_id=p.id,
                available_quantity=ps["stock"],
                reserved_quantity=0,
                sold_quantity=0,
                damaged_quantity=0
            )
            db.add(inv)

    db.commit()
