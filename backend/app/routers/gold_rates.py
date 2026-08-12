from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.gold_rate import GoldRate
from app.schemas.gold_rate import GoldRateCreateRequest
from app.services.gold_rate_service import GoldRateService
from app.services.pricing_service import PricingService
from app.utils.response import success_response

router = APIRouter(prefix="/gold-rates", tags=["Gold Rates"])

@router.get("/latest")
def get_latest_rates(db: Session = Depends(get_db)):
    purities = ["24K", "22K", "18K"]
    result = {}
    for p in purities:
        rate = PricingService.get_active_gold_rate(db, purity=p)
        result[p] = {
            "purity": p,
            "rate_per_gram": rate,
            "currency": "INR",
            "unit": "per_gram",
            "updated_today": True
        }
    return success_response(result)

@router.get("")
def list_gold_rate_history(db: Session = Depends(get_db)):
    rates = db.query(GoldRate).order_by(GoldRate.effective_from.desc()).all()
    return success_response([{
        "id": r.id,
        "purity": r.purity,
        "rate_per_gram": r.rate_per_gram,
        "effective_from": r.effective_from,
        "effective_to": r.effective_to,
        "is_active": r.is_active
    } for r in rates])

@router.post("")
def update_gold_rate(req: GoldRateCreateRequest, user=Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    user_id = user.get("sub") if user else None
    new_rate = GoldRateService.update_gold_rate(
        db=db,
        purity=req.purity,
        rate_per_gram=req.rate_per_gram,
        user_id=user_id
    )
    return success_response({
        "id": new_rate.id,
        "purity": new_rate.purity,
        "rate_per_gram": new_rate.rate_per_gram,
        "effective_from": new_rate.effective_from,
        "is_active": new_rate.is_active,
        "message": f"Updated {new_rate.purity} rate to ₹{new_rate.rate_per_gram}/g. Product catalog prices auto-recalculated."
    })
