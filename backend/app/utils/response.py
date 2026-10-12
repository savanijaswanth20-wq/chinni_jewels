from typing import Any, Optional
from pydantic import BaseModel
from fastapi.encoders import jsonable_encoder

class StandardResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[dict] = None

def success_response(data: Any) -> dict:
    return {
        "success": True,
        "data": jsonable_encoder(data),
        "error": None
    }

def error_response(code: str, message: str, details: Any = None) -> dict:
    return {
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "details": jsonable_encoder(details) if details is not None else None
        }
    }
