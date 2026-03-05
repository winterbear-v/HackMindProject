import os
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET: str = os.getenv("JWT_SECRET", "your_super_secret_jwt_key_change_this_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"id": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[str]:
    """Returns user_id string on success, None on failure."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload.get("id")
    except JWTError:
        return None
