import uuid
from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import TokenResponse

settings = get_settings()


class InvalidRefreshTokenError(Exception):
    pass


def issue_token_pair(db: Session, user: User, family_id: str | None = None) -> TokenResponse:
    """`family_id` is carried forward across rotations of the same login;
    left unset (a brand-new login/register) it starts a new family."""
    access_token = create_access_token(user.id)
    refresh_token, jti = create_refresh_token(user.id)

    db.add(
        RefreshToken(
            jti=jti,
            family_id=family_id or str(uuid.uuid4()),
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


def _revoke_family(db: Session, family_id: str) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.family_id == family_id, RefreshToken.revoked.is_(False)
    ).update({RefreshToken.revoked: True})
    db.commit()


def rotate_refresh_token(db: Session, raw_refresh_token: str) -> TokenResponse:
    """Validates + revokes the presented refresh token and issues a fresh
    pair (refresh token rotation limits the blast radius of a stolen token).

    A revoked token being presented again means it was already rotated-out
    and someone else now holds it — that's a replay of a stolen token, so
    the whole family is killed instead of just rejecting this one request.
    """
    try:
        decoded = decode_token(raw_refresh_token)
    except jwt.PyJWTError as exc:
        raise InvalidRefreshTokenError("Malformed or expired refresh token") from exc

    if decoded.type != "refresh":
        raise InvalidRefreshTokenError("Token is not a refresh token")

    stored = db.query(RefreshToken).filter(RefreshToken.jti == decoded.jti).first()
    if stored is None:
        raise InvalidRefreshTokenError("Refresh token does not exist")

    if stored.revoked:
        _revoke_family(db, stored.family_id)
        raise InvalidRefreshTokenError("Refresh token reuse detected; all sessions revoked")

    # SQLite drops tzinfo on round-trip (Postgres keeps it) — normalize to
    # UTC-aware before comparing so this works the same on either backend.
    expires_at = stored.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise InvalidRefreshTokenError("Refresh token has expired")

    user = db.get(User, decoded.sub)
    if user is None or not user.is_active:
        raise InvalidRefreshTokenError("User no longer exists or is inactive")

    stored.revoked = True
    db.commit()

    return issue_token_pair(db, user, family_id=stored.family_id)


def revoke_refresh_token(db: Session, raw_refresh_token: str) -> None:
    """Best-effort logout: revoke the given refresh token if it's valid/known."""
    try:
        decoded = decode_token(raw_refresh_token)
    except jwt.PyJWTError:
        return

    stored = db.query(RefreshToken).filter(RefreshToken.jti == decoded.jti).first()
    if stored is not None:
        stored.revoked = True
        db.commit()
