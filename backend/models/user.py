from datetime import datetime
from typing import Optional

import bcrypt
from bson import ObjectId

from core.database import get_db


def _serialize(user: dict) -> dict:
    """Convert MongoDB doc to JSON-serialisable dict."""
    if not user:
        return None
    user["id"] = str(user["_id"])
    user.pop("_id", None)
    user.pop("password", None)          # never expose password
    if "createdAt" in user:
        user["createdAt"] = user["createdAt"].isoformat()
    if "updatedAt" in user:
        user["updatedAt"] = user["updatedAt"].isoformat()
    return user


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(10)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ─── CRUD helpers ────────────────────────────────────────────

async def find_user_by_email(email: str, include_password: bool = False) -> Optional[dict]:
    db = get_db()
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        return None
    if not include_password:
        user.pop("password", None)
    return user


async def find_user_by_id(user_id: str, include_password: bool = False) -> Optional[dict]:
    db = get_db()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None
    if not user:
        return None
    if not include_password:
        user.pop("password", None)
    return user


async def create_user(name: str, email: str, password: str) -> dict:
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "name": name.strip(),
        "email": email.lower().strip(),
        "password": hash_password(password),
        "role": "user",
        "avatar": "",
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def get_all_users() -> list[dict]:
    db = get_db()
    users = await db.users.find({}, {"password": 0}).to_list(length=None)
    return users


async def update_user(user_id: str, updates: dict) -> Optional[dict]:
    db = get_db()
    updates["updatedAt"] = datetime.utcnow()
    # Prevent overwriting sensitive fields from request body
    updates.pop("password", None)
    updates.pop("role", None)
    try:
        result = await db.users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": updates},
            return_document=True,
        )
    except Exception:
        return None
    return result


async def delete_user(user_id: str) -> bool:
    db = get_db()
    try:
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count == 1
    except Exception:
        return False


# re-export serializer for use in routers
serialize_user = _serialize
