from sqlalchemy.orm import Session

from app.models.address import Address
from app.schemas.address import AddressWrite


def list_addresses(db: Session, user_id: str) -> list[Address]:
    return (
        db.query(Address)
        .filter(Address.user_id == user_id)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
        .all()
    )


def get_address(db: Session, user_id: str, address_id: str) -> Address | None:
    return db.query(Address).filter(Address.user_id == user_id, Address.id == address_id).first()


def _clear_default(db: Session, user_id: str, except_id: str | None = None) -> None:
    query = db.query(Address).filter(Address.user_id == user_id, Address.is_default.is_(True))
    if except_id is not None:
        query = query.filter(Address.id != except_id)
    query.update({Address.is_default: False})


def create_address(db: Session, user_id: str, data: AddressWrite) -> Address:
    # The very first address a user saves becomes their default automatically —
    # there's otherwise no default and checkout would have nothing to preselect.
    is_first = db.query(Address).filter(Address.user_id == user_id).count() == 0
    is_default = data.is_default or is_first

    if is_default:
        _clear_default(db, user_id)

    address = Address(user_id=user_id, **{**data.model_dump(), "is_default": is_default})
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


def update_address(db: Session, user_id: str, address_id: str, data: AddressWrite) -> Address | None:
    address = get_address(db, user_id, address_id)
    if address is None:
        return None

    if data.is_default and not address.is_default:
        _clear_default(db, user_id, except_id=address_id)

    for field, value in data.model_dump().items():
        setattr(address, field, value)

    db.commit()
    db.refresh(address)
    return address


def delete_address(db: Session, user_id: str, address_id: str) -> bool:
    address = get_address(db, user_id, address_id)
    if address is None:
        return False

    db.delete(address)
    db.commit()

    # Promote the most recently added remaining address so there's always a
    # default whenever at least one address exists.
    if address.is_default:
        next_address = (
            db.query(Address)
            .filter(Address.user_id == user_id)
            .order_by(Address.created_at.desc())
            .first()
        )
        if next_address is not None:
            next_address.is_default = True
            db.commit()

    return True
