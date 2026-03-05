from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ─── Request bodies ──────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    isActive: Optional[bool] = None


# ─── Response bodies ─────────────────────────────────────────
class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar: Optional[str] = ""
    isActive: bool
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class AuthResponse(BaseModel):
    success: bool
    data: dict


class SuccessResponse(BaseModel):
    success: bool
    data: Optional[dict | list] = None
    count: Optional[int] = None
    message: Optional[str] = None
