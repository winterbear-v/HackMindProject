from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.security import decode_token
from models.user import find_user_by_id, serialize_user

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Equivalent to Express `protect` middleware."""
    token = credentials.credentials
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Not authorized, token failed"},
        )
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Not authorized, user not found"},
        )
    return serialize_user(user)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Equivalent to Express `adminOnly` middleware."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": "Admin access required"},
        )
    return current_user
