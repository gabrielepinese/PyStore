from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RefreshToken(Base):
    """
    Server-side record of every refresh token issued, keyed by the JWT's
    `jti` claim. Lets us revoke a single session (logout) or all sessions
    for a user without needing a token blocklist keyed on the raw JWT.

    `family_id` links every token produced by rotating the same original
    login: it stays constant across `/refresh` calls. If a token that's
    already revoked (i.e. already rotated-out) is ever presented again,
    that's a signal the refresh token was stolen and replayed — the whole
    family is revoked in response, killing that session everywhere instead
    of just rejecting the one reused token.
    """

    __tablename__ = "refresh_tokens"

    jti: Mapped[str] = mapped_column(String(36), primary_key=True)
    family_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
