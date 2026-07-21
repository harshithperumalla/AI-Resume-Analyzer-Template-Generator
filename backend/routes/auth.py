import random
from fastapi import APIRouter, HTTPException, status, Header, Depends
from typing import Optional
from datetime import datetime

try:
    from backend.models.user import (
        UserRegister, UserLogin, ForgotPasswordRequest,
        ResetPasswordRequest, AuthTokenResponse, UserResponse
    )
    from backend.database import save_user, get_user_by_email
    from backend.auth import (
        generate_id, create_access_token, verify_password,
        hash_password, active_sessions
    )
except ImportError:
    from models.user import (
        UserRegister, UserLogin, ForgotPasswordRequest,
        ResetPasswordRequest, AuthTokenResponse, UserResponse
    )
    from database import save_user, get_user_by_email
    from auth import (
        generate_id, create_access_token, verify_password,
        hash_password, active_sessions
    )

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister):
    if not body.name or not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required.")
    
    existing = await get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    
    user_id = f"usr-{generate_id()}"
    new_user = {
        "id": user_id,
        "name": body.name,
        "email": body.email,
        "passwordHash": hash_password(body.password),
        "createdAt": datetime.utcnow().isoformat()
    }
    await save_user(new_user)
    
    token = create_access_token(user_id)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": body.name,
            "email": body.email
        }
    }

@router.post("/login", response_model=AuthTokenResponse)
async def login(body: UserLogin):
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    
    user = await get_user_by_email(body.email)
    if not user or not verify_password(body.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    
    token = create_access_token(user["id"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    if not body.email:
        raise HTTPException(status_code=400, detail="Email address is required.")
    
    user = await get_user_by_email(body.email)
    if not user:
        raise HTTPException(status_code=404, detail="No account registered with this email address.")
    
    reset_code = str(random.randint(100000, 999999))
    return {
        "success": True,
        "message": "Security code generated successfully!",
        "resetCode": reset_code,
        "email": user["email"]
    }

@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    if not body.email or not body.newPassword:
        raise HTTPException(status_code=400, detail="Email and new password are required.")
    
    user = await get_user_by_email(body.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    user["passwordHash"] = hash_password(body.newPassword)
    await save_user(user)
    
    return {
        "success": True,
        "message": "Your password has been successfully reset! You can now log in."
    }

@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        active_sessions.pop(token, None)
    return {"message": "Logged out successfully."}
