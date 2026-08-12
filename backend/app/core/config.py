import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "CHINNI JEWELS API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    DATABASE_URL: str = "sqlite:///./gold_business.db"
    
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    JWT_SECRET_KEY: str = "chinni_jewels_super_secret_jwt_key_2026_pure_gold"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    WHATSAPP_BUSINESS_NUMBER: str = "916304702907"
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
