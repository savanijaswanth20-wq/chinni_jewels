from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, require_role
from app.models.profile import Profile, UserRole
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, ProfileResponse
from app.utils.response import success_response

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Profile).filter(Profile.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    hashed_pw = get_password_hash(req.password)
    user = Profile(
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
        hashed_password=hashed_pw,
        role=UserRole.CUSTOMER.value,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return success_response({
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name
    })

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Profile).filter(Profile.email == req.email).first()
    if not user or not user.hashed_password or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated.")

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return success_response({
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name
    })

@router.get("/me")
def get_current_user_profile(user_payload: dict = Depends(require_role(["ADMIN", "STAFF", "CUSTOMER"])), db: Session = Depends(get_db)):
    user = db.query(Profile).filter(Profile.id == user_payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return success_response({
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at
    })
