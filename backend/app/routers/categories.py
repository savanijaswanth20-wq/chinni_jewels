from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.category import Category
from app.schemas.admin import CategoryCreateRequest
from app.utils.response import success_response
from app.utils.helpers import slugify

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("")
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).filter(Category.is_active == True).all()
    return success_response([{
        "id": c.id,
        "name": c.name,
        "slug": c.slug,
        "description": c.description,
        "image_url": c.image_url,
        "is_active": c.is_active
    } for c in categories])

@router.post("")
def create_category(req: CategoryCreateRequest, user=Depends(require_role(["ADMIN", "STAFF"])), db: Session = Depends(get_db)):
    slug = slugify(req.name)
    existing = db.query(Category).filter(Category.slug == slug).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Category with slug '{slug}' already exists.")

    cat = Category(
        name=req.name,
        slug=slug,
        description=req.description,
        image_url=req.image_url
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return success_response({
        "id": cat.id,
        "name": cat.name,
        "slug": cat.slug,
        "description": cat.description
    })
