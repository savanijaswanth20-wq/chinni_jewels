import os
import jwt
import httpx
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL")

security = HTTPBearer()

class AuthService:
    """Service for JWT verification using Supabase JWKS"""
    
    _jwks_cache = None
    _jwks_cache_time = 0
    
    @classmethod
    async def get_jwks(cls):
        """Fetch JWKS from Supabase (with simple caching)"""
        import time
        current_time = time.time()
        
        # Cache for 1 hour
        if cls._jwks_cache and (current_time - cls._jwks_cache_time) < 3600:
            return cls._jwks_cache
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(SUPABASE_JWKS_URL)
                response.raise_for_status()
                cls._jwks_cache = response.json()
                cls._jwks_cache_time = current_time
                return cls._jwks_cache
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch JWKS: {str(e)}"
            )
    
    @classmethod
    async def verify_token(cls, token: str) -> dict:
        """Verify JWT token and return decoded payload"""
        try:
            # Decode without verification first to get kid
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing kid"
                )
            
            # Fetch JWKS
            jwks = await cls.get_jwks()
            
            # Find the key
            key = None
            for jwk in jwks.get("keys", []):
                if jwk.get("kid") == kid:
                    key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
                    break
            
            if not key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: kid not found in JWKS"
                )
            
            # Verify token
            decoded = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                audience="authenticated",
            )
            return decoded
        
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get and verify the current user from JWT"""
    token = credentials.credentials
    return await AuthService.verify_token(token)

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    """Optional auth - returns user if token provided, None otherwise"""
    if credentials:
        token = credentials.credentials
        try:
            return await AuthService.verify_token(token)
        except HTTPException:
            return None
    return None
