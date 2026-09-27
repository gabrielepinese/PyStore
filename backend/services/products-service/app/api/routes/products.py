from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.product import ProductListResponse, ProductRead
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponse)
def list_products(
    category: str | None = Query(default=None, description="Exact category match; omit or 'All' for every category"),
    search: str | None = Query(default=None, description="Case-insensitive substring match on product name"),
    limit: int | None = Query(default=None, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ProductListResponse:
    items, total = product_service.list_products(db, category=category, search=search, limit=limit, offset=offset)
    return ProductListResponse(
        items=[ProductRead.model_validate(item) for item in items],
        total=total,
        limit=limit or len(items),
        offset=offset,
    )


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)) -> list[str]:
    return product_service.list_categories(db)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: str, db: Session = Depends(get_db)) -> ProductRead:
    product = product_service.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ProductRead.model_validate(product)
