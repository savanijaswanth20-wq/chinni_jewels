import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.product import Product, ProductImage
from app.models.category import Category
from app.schemas.product import ProductCreateRequest, ProductUpdateRequest
from app.services.pricing_service import PricingService
from app.services.inventory_service import InventoryService
from app.utils.response import success_response

router = APIRouter(prefix="/products", tags=["Products"])

def slugify(text: str) -> str:
    return re.sub(r'[\W_]+', '-', text.lower()).strip('-')

def build_product_dto(p: Product, db: Session) -> dict:
    pricing = PricingService.calculate_product_price(
        db=db,
        weight_grams=p.weight_grams,
        purity=p.purity,
        making_charge=p.making_charge,
        gst_percentage=p.gst_percentage
    )

    inv = InventoryService.get_or_create_inventory(db, p.id, default_stock=p.stock_quantity)

    images = [{
        "id": img.id,
        "image_url": img.image_url,
        "alt_text": img.alt_text,
        "sort_order": img.sort_order,
        "is_primary": img.is_primary
    } for img in p.images]

    return {
        "id": p.id,
        "category_id": p.category_id,
        "category_name": p.category.name if p.category else None,
        "name": p.name,
        "slug": p.slug,
        "description": p.description,
        "sku": p.sku,
        "purity": p.purity,
        "weight_grams": p.weight_grams,
        "making_charge": p.making_charge,
        "gst_percentage": p.gst_percentage,
        "base_price": pricing["gold_value"],
        "selling_price": pricing["total_price"],
        "stock_quantity": inv.available_quantity,
        "reserved_quantity": inv.reserved_quantity,
        "low_stock_threshold": p.low_stock_threshold,
        "stock_status": InventoryService.get_stock_status(inv),
        "is_featured": p.is_featured,
        "is_active": p.is_active,
        "images": images,
        "price_breakdown": pricing,
        "created_at": p.created_at,
        "updated_at": p.updated_at
    }

@router.get("")
def list_products(
    category_slug: Optional[str] = Query(None),
    purity: Optional[str] = Query(None),
    is_featured: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.is_active == True)

    if category_slug:
        cat = db.query(Category).filter(Category.slug == category_slug).first()
        if cat:
            query = query.filter(Product.category_id == cat.id)

    if purity:
        query = query.filter(Product.purity == purity)

    if is_featured is not None:
        query = query.filter(Product.is_featured == is_featured)

    if search:
        s = f"%{search}%"
        query = query.filter((Product.name.like(s)) | (Product.sku.like(s)))

    products = query.order_by(Product.created_at.desc()).all()
    return success_response([build_product_dto(p, db) for p in products])

@router.get("/{id_or_slug}")
def get_product(id_or_slug: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(
        (Product.id == id_or_slug) | (Product.slug == id_or_slug)
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    return success_response(build_product_dto(product, db))

@router.post("")
def create_product(req: ProductCreateRequest, user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    existing_sku = db.query(Product).filter(Product.sku == req.sku).first()
    if existing_sku:
        raise HTTPException(status_code=400, detail=f"Product with SKU '{req.sku}' already exists.")

    slug = slugify(req.name)
    existing_slug = db.query(Product).filter(Product.slug == slug).first()
    if existing_slug:
        slug = f"{slug}-{req.sku.lower()}"

    pricing = PricingService.calculate_product_price(
        db=db,
        weight_grams=req.weight_grams,
        purity=req.purity,
        making_charge=req.making_charge,
        gst_percentage=req.gst_percentage
    )

    product = Product(
        category_id=req.category_id,
        name=req.name,
        slug=slug,
        description=req.description,
        sku=req.sku,
        purity=req.purity,
        weight_grams=req.weight_grams,
        making_charge=req.making_charge,
        gst_percentage=req.gst_percentage,
        base_price=pricing["gold_value"],
        selling_price=pricing["total_price"],
        stock_quantity=req.stock_quantity,
        low_stock_threshold=req.low_stock_threshold,
        is_featured=req.is_featured,
        is_active=True
    )
    db.add(product)
    db.flush()

    # Create Inventory
    InventoryService.get_or_create_inventory(db, product.id, default_stock=req.stock_quantity)

    # Attach images if provided
    if req.image_urls:
        for idx, url in enumerate(req.image_urls):
            img = ProductImage(
                product_id=product.id,
                image_url=url,
                sort_order=idx,
                is_primary=(idx == 0)
            )
            db.add(img)

    db.commit()
    db.refresh(product)
    return success_response(build_product_dto(product, db))

@router.put("/{product_id}")
def update_product(product_id: str, req: ProductUpdateRequest, user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(product, field, val)

    # Recalculate selling price
    pricing = PricingService.calculate_product_price(
        db=db,
        weight_grams=product.weight_grams,
        purity=product.purity,
        making_charge=product.making_charge,
        gst_percentage=product.gst_percentage
    )
    product.base_price = pricing["gold_value"]
    product.selling_price = pricing["total_price"]

    db.commit()
    db.refresh(product)
    return success_response(build_product_dto(product, db))

@router.delete("/{product_id}")
def delete_product(product_id: str, user=Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product.is_active = False  # Soft delete
    db.commit()
    return success_response({"message": f"Product '{product.name}' deactivated successfully."})
