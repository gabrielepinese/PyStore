import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Order(Base):
    """A checkout attempt. `status` moves pending -> paid, or pending ->
    failed if the card is declined; it never reverses. Shipping address is
    a snapshot taken at checkout time, not a live reference to the address
    stored in auth-service — so a later edit to that address doesn't rewrite
    history on past orders."""

    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="usd")
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    total: Mapped[float] = mapped_column(Float, nullable=False)

    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    shipping_full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    shipping_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    shipping_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shipping_city: Mapped[str] = mapped_column(String(120), nullable=False)
    shipping_postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    shipping_country: Mapped[str] = mapped_column(String(120), nullable=False)
    shipping_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.id"
    )


class OrderItem(Base):
    """Line item snapshot: name/price are copied at order time so the order
    still reads correctly even if the product is later renamed, repriced,
    or removed from the catalog."""

    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id: Mapped[str] = mapped_column(String(36), ForeignKey("orders.id"), nullable=False, index=True)

    product_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)

    order: Mapped[Order] = relationship(back_populates="items")
