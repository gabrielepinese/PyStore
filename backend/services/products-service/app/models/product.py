import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    original_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    reviews: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Inventory count, surfaced on the product detail only — never aggregated
    # into category summaries or facets, so it stays out of analytics.
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    badge: Mapped[str | None] = mapped_column(String(20), nullable=True)
    accent: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
