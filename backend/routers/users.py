from fastapi import APIRouter, Depends, HTTPException, status

from models.user import (
    get_all_users,
    find_user_by_id,
    update_user,
    delete_user,
    serialize_user,
)
from schemas.user import UpdateUserRequest
from middleware.auth import get_current_user, require_admin

router = APIRouter()


# @route  GET /api/users
# @access Private / Admin
@router.get("/")
async def list_users(_: dict = Depends(require_admin)):
    users = await get_all_users()
    serialized = [serialize_user(u) for u in users]
    return {"success": True, "count": len(serialized), "data": serialized}


# @route  GET /api/users/:id
# @access Private
@router.get("/{user_id}")
async def get_user(user_id: str, _: dict = Depends(get_current_user)):
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User not found"},
        )
    return {"success": True, "data": serialize_user(user)}


# @route  PUT /api/users/:id
# @access Private
@router.put("/{user_id}")
async def update_user_route(
    user_id: str,
    body: UpdateUserRequest,
    _: dict = Depends(get_current_user),
):
    updates = body.model_dump(exclude_none=True)
    user = await update_user(user_id, updates)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User not found"},
        )
    return {"success": True, "data": serialize_user(user)}


# @route  DELETE /api/users/:id
# @access Private / Admin
@router.delete("/{user_id}")
async def delete_user_route(user_id: str, _: dict = Depends(require_admin)):
    deleted = await delete_user(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User not found"},
        )
    return {"success": True, "message": "User deleted successfully"}
