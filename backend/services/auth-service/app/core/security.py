import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
import jwt
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()

TokenType = Literal["access", "refresh"]


class DecodedToken(BaseModel):
    sub: str  # user id
    type: TokenType
    jti: str
    exp: datetime


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def _create_token(user_id: str, token_type: TokenType, expires_delta: timedelta) -> tuple[str, str]:
    """Returns (encoded_jwt, jti). jti lets refresh tokens be tracked/revoked server-side."""
    jti = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": token_type,
        "jti": jti,
        "iat": now,
        "exp": now + expires_delta,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, jti


def create_access_token(user_id: str) -> str:
    token, _ = _create_token(
        user_id, "access", timedelta(minutes=settings.access_token_expire_minutes)
    )
    return token


def create_refresh_token(user_id: str) -> tuple[str, str]:
    """Returns (token, jti) — the caller persists jti so the token can be revoked/rotated."""
    return _create_token(user_id, "refresh", timedelta(days=settings.refresh_token_expire_days))


def decode_token(token: str) -> DecodedToken:
    """Raises jwt.PyJWTError (expired/invalid signature/malformed) on failure."""
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    return DecodedToken.model_validate(payload)
