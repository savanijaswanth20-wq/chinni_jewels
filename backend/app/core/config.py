import os
import secrets
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "CHINNI ONE GRAM GOLD API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    DATABASE_URL: str = "sqlite:///./gold_business.db"
    
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # SECURITY: Set JWT_SECRET_KEY via environment variable in production.
    # A random fallback is generated for local development only.
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    @field_validator("JWT_SECRET_KEY", mode="before")
    @classmethod
    def set_jwt_secret(cls, v):
        if v and v.strip():
            return v
        # Auto-generate for development; logs a warning
        import logging
        logging.getLogger(__name__).warning(
            "JWT_SECRET_KEY not set — using auto-generated secret. "
            "Set JWT_SECRET_KEY env var in production!"
        )
        return secrets.token_urlsafe(64)
    
    WHATSAPP_BUSINESS_NUMBER: str = "919542124161"
    WHATSAPP_CLOUD_API_TOKEN: str = ""
    WHATSAPP_CLOUD_API_PHONE_ID: str = ""
    WHATSAPP_CLOUD_API_VERSION: str = "v18.0"
    SITE_BASE_URL: str = "http://127.0.0.1:8000"
    CORS_ORIGINS: Union[List[str], str] = ["*"]
    
    ENVIRONMENT: str = "development"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    return [v]
            return [i.strip() for i in v.split(",")]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
