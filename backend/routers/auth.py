from fastapi import APIRouter, Depends, HTTPException, status

from models.user import (
    create_user,
    find_user_by_email,
    serialize_user,
    verify_password,
)
from schemas.user import RegisterRequest, LoginRequest
from core.security import create_access_token
from middleware.auth import get_current_user

router = APIRouter()


# @route  POST /api/auth/register
# @access Public
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    existing = await find_user_by_email(body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "User already exists"},
        )

    user = await create_user(body.name, body.email, body.password)
    user_out = serialize_user(user)

    return {
        "success": True,
        "data": {
            **user_out,
            "token": create_access_token(user_out["id"]),
        },
    }


# @route  POST /api/auth/login
# @access Public
@router.post("/login")
async def login(body: LoginRequest):
    user = await find_user_by_email(body.email, include_password=True)
    if not user or not verify_password(body.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Invalid email or password"},
        )

    user_out = serialize_user(user)

    return {
        "success": True,
        "data": {
            **user_out,
            "token": create_access_token(user_out["id"]),
        },
    }


# @route  GET /api/auth/me
# @access Private
@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"success": True, "data": current_user}
