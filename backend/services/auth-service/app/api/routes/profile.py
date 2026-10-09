from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.address import AddressRead, AddressWrite
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodRead, PaymentMethodUpdate
from app.schemas.user import UserRead, UserUpdate
from app.services import address_service, payment_method_service, user_service

router = APIRouter(prefix="/auth/me", tags=["profile"])


@router.patch("", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserRead:
    user = user_service.update_profile(db, current_user, payload)
    return UserRead.model_validate(user)


@router.get("/addresses", response_model=list[AddressRead])
def list_addresses(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[AddressRead]:
    return [
        AddressRead.model_validate(a) for a in address_service.list_addresses(db, current_user.id)
    ]


@router.post("/addresses", response_model=AddressRead, status_code=status.HTTP_201_CREATED)
def create_address(
    payload: AddressWrite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AddressRead:
    address = address_service.create_address(db, current_user.id, payload)
    return AddressRead.model_validate(address)


@router.put("/addresses/{address_id}", response_model=AddressRead)
def update_address(
    address_id: str,
    payload: AddressWrite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AddressRead:
    address = address_service.update_address(db, current_user.id, address_id, payload)
    if address is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    return AddressRead.model_validate(address)


@router.delete("/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    deleted = address_service.delete_address(db, current_user.id, address_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")


@router.get("/payment-methods", response_model=list[PaymentMethodRead])
def list_payment_methods(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[PaymentMethodRead]:
    return [
        PaymentMethodRead.model_validate(p)
        for p in payment_method_service.list_payment_methods(db, current_user.id)
    ]


@router.post(
    "/payment-methods", response_model=PaymentMethodRead, status_code=status.HTTP_201_CREATED
)
def create_payment_method(
    payload: PaymentMethodCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentMethodRead:
    card = payment_method_service.create_payment_method(db, current_user.id, payload)
    return PaymentMethodRead.model_validate(card)


@router.put("/payment-methods/{payment_method_id}", response_model=PaymentMethodRead)
def update_payment_method(
    payment_method_id: str,
    payload: PaymentMethodUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentMethodRead:
    card = payment_method_service.update_payment_method(
        db, current_user.id, payment_method_id, payload
    )
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found")
    return PaymentMethodRead.model_validate(card)


@router.delete("/payment-methods/{payment_method_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_method(
    payment_method_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    deleted = payment_method_service.delete_payment_method(db, current_user.id, payment_method_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found")
