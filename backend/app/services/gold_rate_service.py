from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.gold_rate import GoldRate
from app.services.pricing_service import PricingService
from app.models.audit import AuditLog

class GoldRateService:
    @staticmethod
    def update_gold_rate(db: Session, purity: str, rate_per_gram: float, user_id: str = None) -> GoldRate:
        """Update active gold rate and recalculate catalog pricing automatically."""
        # Deactivate current active rates for this purity
        active_rates = db.query(GoldRate).filter(
            GoldRate.purity == purity,
            GoldRate.is_active == True
        ).all()

        now = datetime.now(timezone.utc)
        for r in active_rates:
            r.is_active = False
            r.effective_to = now

        # Create new rate entry
        new_rate = GoldRate(
            purity=purity,
            rate_per_gram=rate_per_gram,
            effective_from=now,
            is_active=True,
            created_by=user_id
        )
        db.add(new_rate)

        # Audit log
        audit = AuditLog(
            user_id=user_id,
            action="UPDATE_GOLD_RATE",
            entity_type="GOLD_RATE",
            entity_id=new_rate.id,
            new_value=f"Purity: {purity}, Rate: {rate_per_gram}"
        )
        db.add(audit)
        db.commit()
        db.refresh(new_rate)

        # Automatically update all product selling prices in the database
        PricingService.update_all_product_prices(db)

        return new_rate
