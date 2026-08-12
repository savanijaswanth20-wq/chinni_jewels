import urllib.parse
import urllib.request
import json
import logging
from typing import Any, Dict
from app.core.config import settings

logger = logging.getLogger(__name__)

def format_currency(val: float) -> str:
    """Format numbers into Indian rupee string format (e.g. ₹7,000 or ₹15,038)."""
    if val is None:
        return "₹0"
    if isinstance(val, (int, float)):
        if val == int(val):
            return f"₹{int(val):,}"
        return f"₹{val:,.2f}"
    return f"₹{val}"

class WhatsAppService:
    @staticmethod
    def generate_order_message(order: Any) -> str:
        """
        Generate structured text message containing COMPLETE ORDER INFORMATION.
        Format strictly follows the professional CNINNI JEWELS WhatsApp order template.
        """
        # Handle dict or ORM object
        order_dict = order if isinstance(order, dict) else {
            "order_number": getattr(order, "order_number", getattr(order, "id", "")),
            "customer_name": getattr(order, "customer_name", ""),
            "phone": getattr(order, "phone", ""),
            "email": getattr(order, "email", None),
            "address": getattr(order, "address", ""),
            "city": getattr(order, "city", ""),
            "state": getattr(order, "state", ""),
            "pincode": getattr(order, "pincode", ""),
            "subtotal": getattr(order, "subtotal", 0.0),
            "making_charges": getattr(order, "making_charges", 0.0),
            "gst": getattr(order, "gst", 0.0),
            "discount": getattr(order, "discount", 0.0),
            "total_amount": getattr(order, "total_amount", 0.0),
            "payment_preference": getattr(order, "payment_preference", getattr(order, "payment_method", "UPI")),
            "items": getattr(order, "items", [])
        }

        order_number = order_dict.get("order_number", "")
        customer_name = order_dict.get("customer_name", "")
        phone = order_dict.get("phone", "")
        email = order_dict.get("email", None)
        address = order_dict.get("address", "")
        city = order_dict.get("city", "")
        state = order_dict.get("state", "")
        pincode = order_dict.get("pincode", "")
        subtotal = order_dict.get("subtotal", 0.0)
        making_charges = order_dict.get("making_charges", 0.0)
        gst = order_dict.get("gst", 0.0)
        discount = order_dict.get("discount", 0.0)
        total_amount = order_dict.get("total_amount", 0.0)
        payment_pref = order_dict.get("payment_preference") or order_dict.get("payment_method") or "UPI"

        items = order_dict.get("items", [])

        # Build PRODUCT DETAILS block
        product_blocks = []
        gold_rate_used = 0.0
        gold_value_total = 0.0

        for idx, item in enumerate(items, 1):
            it = item if isinstance(item, dict) else {
                "product_name": getattr(item, "product_name", "Gold Product"),
                "sku": getattr(item, "sku", "N/A"),
                "weight_grams": getattr(item, "weight_grams", 1.0),
                "purity": getattr(item, "purity", "24K / 999"),
                "quantity": getattr(item, "quantity", 1),
                "product_image_url": getattr(item, "product_image_url", None),
                "gold_rate": getattr(item, "gold_rate", getattr(item, "unit_price", 0.0)),
                "gold_value": getattr(item, "gold_value", getattr(item, "unit_price", 0.0) * getattr(item, "quantity", 1))
            }

            p_name = it.get("product_name") or "1 Gram Gold Coin"
            p_sku = it.get("sku") or "N/A"
            p_weight = f"{it.get('weight_grams', 1.0)} Gram"
            p_purity = it.get("purity") or "24K / 999"
            p_qty = it.get("quantity", 1)
            img_url = it.get("product_image_url") or f"{settings.SITE_BASE_URL}/assets/hero_gold_coin.png"

            if not img_url.startswith("http://") and not img_url.startswith("https://"):
                base = settings.SITE_BASE_URL.rstrip('/')
                img_url = f"{base}/{img_url.lstrip('/')}"

            gold_rate_used = it.get("gold_rate", 0.0) or gold_rate_used
            gold_value_total += it.get("gold_value", 0.0) or (gold_rate_used * p_qty)

            if len(items) == 1:
                p_block = (
                    f"Product:\n{p_name}\n\n"
                    f"SKU:\n{p_sku}\n\n"
                    f"Weight:\n{p_weight}\n\n"
                    f"Purity:\n{p_purity}\n\n"
                    f"Quantity:\n{p_qty}\n\n"
                    f"Product Image:\n{img_url}"
                )
            else:
                p_block = (
                    f"Item #{idx}:\n"
                    f"Product:\n{p_name}\n"
                    f"SKU:\n{p_sku}\n"
                    f"Weight:\n{p_weight}\n"
                    f"Purity:\n{p_purity}\n"
                    f"Quantity:\n{p_qty}\n"
                    f"Product Image:\n{img_url}"
                )
            product_blocks.append(p_block)

        product_details_str = "\n\n".join(product_blocks) if product_blocks else "Product Details Not Specified"

        if gold_value_total == 0:
            gold_value_total = subtotal

        # Build PRICE DETAILS block
        price_lines = []
        if gold_rate_used > 0:
            price_lines.append(f"Gold Rate:\n{format_currency(gold_rate_used)} / Gram\n")
        price_lines.append(f"Gold Value:\n{format_currency(gold_value_total)}\n")
        price_lines.append(f"Making Charges:\n{format_currency(making_charges)}\n")
        price_lines.append(f"GST:\n{format_currency(gst)}")

        if discount > 0:
            price_lines.append(f"\nDiscount:\n-{format_currency(discount)}")

        price_details_str = "\n".join(price_lines)

        # Build CUSTOMER DETAILS block
        cust_lines = [
            f"Name:\n{customer_name}\n",
            f"Mobile:\n{phone}"
        ]
        if email and str(email).strip():
            cust_lines.append(f"\n\nEmail:\n{str(email).strip()}")
        customer_details_str = "\n".join(cust_lines)

        # Build message
        msg = (
            f"🪙 NEW GOLD ORDER\n\n"
            f"━━━━━━━━━━━━━━━━━━\n\n"
            f"ORDER ID:\n"
            f"{order_number}\n\n"
            f"PRODUCT DETAILS\n\n"
            f"{product_details_str}\n\n"
            f"━━━━━━━━━━━━━━━━━━\n\n"
            f"PRICE DETAILS\n\n"
            f"{price_details_str}\n\n"
            f"━━━━━━━━━━━━━━━━━━\n\n"
            f"TOTAL:\n"
            f"{format_currency(total_amount)}\n\n"
            f"━━━━━━━━━━━━━━━━━━\n\n"
            f"CUSTOMER DETAILS\n\n"
            f"{customer_details_str}\n\n"
            f"━━━━━━━━━━━━━━━━━━\n\n"
            f"DELIVERY ADDRESS\n\n"
            f"Address:\n{address}\n\n"
            f"City:\n{city}\n\n"
            f"State:\n{state}\n\n"
            f"Pincode:\n{pincode}\n\n"
            f"━━━━━━━━━━━━━━━━━━\n\n"
            f"PAYMENT\n\n"
            f"Payment Preference:\n{payment_pref}\n\n"
            f"━━━━━━━━━━━━━━━━━━\n\n"
            f"Please confirm this order.\n\n"
            f"Thank you."
        )

        return msg

    @staticmethod
    def generate_whatsapp_url(order: Any) -> str:
        """Generate click-to-chat WhatsApp deep link URL."""
        if isinstance(order, str):
            raw_msg = order
        else:
            raw_msg = WhatsAppService.generate_order_message(order)

        encoded_msg = urllib.parse.quote(raw_msg)
        wa_number = settings.WHATSAPP_BUSINESS_NUMBER.replace("+", "").replace(" ", "").replace("-", "")
        return f"https://api.whatsapp.com/send?phone={wa_number}&text={encoded_msg}"

    @staticmethod
    def send_whatsapp_order(order: Any) -> Dict[str, Any]:
        """
        Layer 2 Architecture: Trigger Meta WhatsApp Cloud API if credentials exist.
        Fallback to Layer 1 click-to-chat payload.
        """
        message_text = WhatsAppService.generate_order_message(order)
        whatsapp_url = WhatsAppService.generate_whatsapp_url(message_text)

        token = settings.WHATSAPP_CLOUD_API_TOKEN
        phone_id = settings.WHATSAPP_CLOUD_API_PHONE_ID
        version = settings.WHATSAPP_CLOUD_API_VERSION

        if token and phone_id:
            try:
                endpoint = f"https://graph.facebook.com/{version}/{phone_id}/messages"
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }

                recipient = getattr(order, "phone", settings.WHATSAPP_BUSINESS_NUMBER)

                payload = {
                    "messaging_product": "whatsapp",
                    "to": recipient,
                    "type": "text",
                    "text": {
                        "body": message_text
                    }
                }

                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(endpoint, data=data, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=10) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    logger.info("WhatsApp Cloud API message sent successfully.")
                    return {
                        "status": "sent",
                        "layer": "Layer 2 Cloud API",
                        "response": res_body,
                        "whatsapp_url": whatsapp_url,
                        "whatsapp_message": message_text
                    }
            except Exception as e:
                logger.error(f"Error calling WhatsApp Cloud API: {str(e)}")

        return {
            "status": "ready",
            "layer": "Layer 1 Deep-Link",
            "whatsapp_url": whatsapp_url,
            "whatsapp_message": message_text
        }
