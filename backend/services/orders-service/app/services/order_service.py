import uuid

import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.order import Order, OrderItem
from app.schemas.order import OrderCreateRequest
from app.services.products_client import get_product

settings = get_settings()
stripe.api_key = settings.stripe_secret_key


class EmptyOrderError(Exception):
    """The item list was empty."""


class ProductNotFoundError(Exception):
    def __init__(self, product_id: str):
        self.product_id = product_id
        super().__init__(f"Product {product_id} not found")


class OutOfStockError(Exception):
    def __init__(self, product_name: str):
        self.product_name = product_name
        super().__init__(f"'{product_name}' doesn't have enough stock left")


def create_order(db: Session, user_id: str, request: OrderCreateRequest) -> tuple[Order, str]:
    """Re-prices every line against products-service, opens a Stripe
    PaymentIntent for the verified total, then persists the order already
    linked to that intent. The intent is created before the order row so a
    Stripe failure never leaves an orphaned pending order behind."""
    if not request.items:
        raise EmptyOrderError()

    order_items: list[OrderItem] = []
    subtotal = 0.0
    for item in request.items:
        product = get_product(item.product_id)
        if product is None:
            raise ProductNotFoundError(item.product_id)
        if product.stock < item.qty:
            raise OutOfStockError(product.name)

        subtotal += product.price * item.qty
        order_items.append(
            OrderItem(product_id=product.id, name=product.name, unit_price=product.price, qty=item.qty)
        )

    total = subtotal  # no tax/shipping in this mock storefront

    order_id = str(uuid.uuid4())
    intent = stripe.PaymentIntent.create(
        amount=round(total * 100),
        currency="usd",
        metadata={"order_id": order_id},
        automatic_payment_methods={"enabled": True},
    )

    address = request.shipping_address
    order = Order(
        id=order_id,
        user_id=user_id,
        status="pending",
        currency="usd",
        subtotal=subtotal,
        total=total,
        stripe_payment_intent_id=intent.id,
        shipping_full_name=address.full_name,
        shipping_line1=address.line1,
        shipping_line2=address.line2,
        shipping_city=address.city,
        shipping_postal_code=address.postal_code,
        shipping_country=address.country,
        shipping_phone=address.phone,
        items=order_items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    return order, intent.client_secret


def confirm_order(db: Session, user_id: str, order_id: str) -> Order | None:
    """Re-checks the PaymentIntent directly with Stripe rather than trusting
    the client's say-so that payment succeeded."""
    order = get_order(db, user_id, order_id)
    if order is None or order.status == "paid":
        return order

    intent = stripe.PaymentIntent.retrieve(order.stripe_payment_intent_id)
    if intent.status == "succeeded":
        order.status = "paid"
    elif intent.status in ("canceled",):
        order.status = "failed"

    db.commit()
    db.refresh(order)
    return order


def mark_paid_by_intent(db: Session, payment_intent_id: str) -> None:
    """Used by the Stripe webhook — looks the order up by intent id since the
    webhook has no authenticated user context."""
    order = db.scalar(select(Order).where(Order.stripe_payment_intent_id == payment_intent_id))
    if order is not None and order.status != "paid":
        order.status = "paid"
        db.commit()


def mark_failed_by_intent(db: Session, payment_intent_id: str) -> None:
    order = db.scalar(select(Order).where(Order.stripe_payment_intent_id == payment_intent_id))
    if order is not None and order.status == "pending":
        order.status = "failed"
        db.commit()


def list_orders(db: Session, user_id: str) -> list[Order]:
    return list(
        db.scalars(select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc()))
    )


def get_order(db: Session, user_id: str, order_id: str) -> Order | None:
    order = db.get(Order, order_id)
    if order is None or order.user_id != user_id:
        return None
    return order
