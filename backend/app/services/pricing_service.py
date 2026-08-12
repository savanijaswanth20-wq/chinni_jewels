from sqlalchemy.orm import Session
from app.models.gold_rate import GoldRate
from app.models.product import Product

class PricingService:
    @staticmethod
    def get_active_gold_rate(db: Session, purity: str = "24K") -> float:
        """Fetch current effective gold rate per gram for purity."""
        rate_entry = db.query(GoldRate).filter(
            GoldRate.purity == purity,
            GoldRate.is_active == True
        ).order_by(GoldRate.effective_from.desc()).first()

        if rate_entry:
            return rate_entry.rate_per_gram
        
        # Default fallback rates if database is fresh
        default_rates = {
            "24K": 9240.0,
            "22K": 8470.0,
            "18K": 6930.0
        }
        return default_rates.get(purity, 9240.0)

    @staticmethod
    def calculate_product_price(db: Session, weight_grams: float, purity: str, making_charge: float, gst_percentage: float = 3.0) -> dict:
        """
        Gold Value = Current Gold Rate x Weight
        Subtotal = Gold Value + Making Charges
        GST = GST percentage x Subtotal
        Final Price = Subtotal + GST
        """
        gold_rate = PricingService.get_active_gold_rate(db, purity=purity)
        gold_value = round(gold_rate * weight_grams, 2)
        subtotal = round(gold_value + making_charge, 2)
        gst_amount = round(subtotal * (gst_percentage / 100.0), 2)
        final_price = round(subtotal + gst_amount, 2)

        return {
            "gold_value": gold_value,
            "making_charges": making_charge,
            "gst_amount": gst_amount,
            "total_price": final_price,
            "gold_rate_used": gold_rate,
            "purity": purity
        }

    @staticmethod
    def update_all_product_prices(db: Session):
        """Recalculate selling prices across all active catalog products when gold rate changes."""
        products = db.query(Product).filter(Product.is_active == True).all()
        for p in products:
            pricing = PricingService.calculate_product_price(
                db=db,
                weight_grams=p.weight_grams,
                purity=p.purity,
                making_charge=p.making_charge,
                gst_percentage=p.gst_percentage
            )
            p.base_price = pricing["gold_value"]
            p.selling_price = pricing["total_price"]
        db.commit()
