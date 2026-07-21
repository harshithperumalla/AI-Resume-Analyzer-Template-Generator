from pydantic import BaseModel, EmailStr
from typing import Optional

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    newPassword: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str

class AuthTokenResponse(BaseModel):
    token: str
    user: UserResponse

class UserModel(BaseModel):
    id: str
    email: str
    name: str
    passwordHash: str
    profilePicture: Optional[str] = None
    createdAt: str
