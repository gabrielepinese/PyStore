import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.db.session import get_db
from app.schemas.order import OrderCreateRequest, OrderCreateResponse, OrderRead
from app.services import order_service
from app.services.products_client import ProductLookupError

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderCreateResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    request: OrderCreateRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> OrderCreateResponse:
    try:
        order, client_secret = order_service.create_order(db, user_id, request)
    except order_service.EmptyOrderError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Cart is empty")
    except order_service.ProductNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except order_service.OutOfStockError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ProductLookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not verify product details"
        ) from exc
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Payment provider error"
        ) from exc

    return OrderCreateResponse(order=OrderRead.model_validate(order), client_secret=client_secret)


@router.post("/{order_id}/confirm", response_model=OrderRead)
def confirm_order(
    order_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> OrderRead:
    try:
        order = order_service.confirm_order(db, user_id, order_id)
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Payment provider error"
        ) from exc

    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    return OrderRead.model_validate(order)


@router.get("", response_model=list[OrderRead])
def list_orders(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> list[OrderRead]:
    orders = order_service.list_orders(db, user_id)
    return [OrderRead.model_validate(order) for order in orders]


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> OrderRead:
    order = order_service.get_order(db, user_id, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return OrderRead.model_validate(order)
