from sqlalchemy.orm import Session

from app.core.card_brands import detect_brand
from app.models.payment_method import PaymentMethod
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate


def list_payment_methods(db: Session, user_id: str) -> list[PaymentMethod]:
    return (
        db.query(PaymentMethod)
        .filter(PaymentMethod.user_id == user_id)
        .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
        .all()
    )


def get_payment_method(db: Session, user_id: str, payment_method_id: str) -> PaymentMethod | None:
    return (
        db.query(PaymentMethod)
        .filter(PaymentMethod.user_id == user_id, PaymentMethod.id == payment_method_id)
        .first()
    )


def _clear_default(db: Session, user_id: str, except_id: str | None = None) -> None:
    query = db.query(PaymentMethod).filter(
        PaymentMethod.user_id == user_id, PaymentMethod.is_default.is_(True)
    )
    if except_id is not None:
        query = query.filter(PaymentMethod.id != except_id)
    query.update({PaymentMethod.is_default: False})


def create_payment_method(db: Session, user_id: str, data: PaymentMethodCreate) -> PaymentMethod:
    is_first = db.query(PaymentMethod).filter(PaymentMethod.user_id == user_id).count() == 0
    is_default = data.is_default or is_first

    if is_default:
        _clear_default(db, user_id)

    # `data.card_number` never touches the database — only its derived
    # brand/last4 do. The full value goes out of scope the moment this
    # function returns.
    brand = detect_brand(data.card_number)
    assert brand is not None  # PaymentMethodCreate already rejected anything else

    card = PaymentMethod(
        user_id=user_id,
        brand=brand,
        last4=data.card_number[-4:],
        exp_month=data.exp_month,
        exp_year=data.exp_year,
        cardholder_name=data.cardholder_name,
        is_default=is_default,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def update_payment_method(
    db: Session, user_id: str, payment_method_id: str, data: PaymentMethodUpdate
) -> PaymentMethod | None:
    card = get_payment_method(db, user_id, payment_method_id)
    if card is None:
        return None

    if data.is_default and not card.is_default:
        _clear_default(db, user_id, except_id=payment_method_id)
        card.is_default = True
        db.commit()
        db.refresh(card)

    return card


def delete_payment_method(db: Session, user_id: str, payment_method_id: str) -> bool:
    card = get_payment_method(db, user_id, payment_method_id)
    if card is None:
        return False

    db.delete(card)
    db.commit()

    if card.is_default:
        next_card = (
            db.query(PaymentMethod)
            .filter(PaymentMethod.user_id == user_id)
            .order_by(PaymentMethod.created_at.desc())
            .first()
        )
        if next_card is not None:
            next_card.is_default = True
            db.commit()

    return True
