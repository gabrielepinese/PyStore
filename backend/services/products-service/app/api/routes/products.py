from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.product import (
    CategorySummary,
    ProductFacets,
    ProductListResponse,
    ProductRead,
    ReviewListResponse,
    ReviewRead,
)
from app.services import product_service
from app.services.product_service import SortKey

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponse)
def list_products(
    category: str | None = Query(
        default=None,
        description="Exact category match; omit or 'All' for every category",
    ),
    search: str | None = Query(
        default=None,
        description="Case-insensitive substring match on product name or category",
    ),
    min_price: float | None = Query(default=None, ge=0, alias="minPrice"),
    max_price: float | None = Query(default=None, ge=0, alias="maxPrice"),
    min_rating: float | None = Query(default=None, ge=0, le=5, alias="minRating"),
    on_sale: bool = Query(
        default=False, alias="onSale", description="Only discounted products"
    ),
    badge: str | None = Query(
        default=None, description="Case-insensitive badge match, e.g. 'New'"
    ),
    sort: SortKey = Query(default="newest"),
    limit: int | None = Query(default=None, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ProductListResponse:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="minPrice cannot exceed maxPrice",
        )

    items, total = product_service.list_products(
        db,
        category=category,
        search=search,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        on_sale=on_sale,
        badge=badge,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    return ProductListResponse(
        items=[ProductRead.model_validate(item) for item in items],
        total=total,
        limit=limit or len(items),
        offset=offset,
    )


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)) -> list[str]:
    return product_service.list_categories(db)


@router.get("/categories/summary", response_model=list[CategorySummary])
def list_category_summaries(db: Session = Depends(get_db)) -> list[CategorySummary]:
    return product_service.category_summaries(db)


@router.get("/facets", response_model=ProductFacets)
def get_facets(
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> ProductFacets:
    return product_service.facets(db, category=category, search=search)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: str, db: Session = Depends(get_db)) -> ProductRead:
    product = product_service.get_product(db, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return ProductRead.model_validate(product)


@router.get("/{product_id}/reviews", response_model=ReviewListResponse)
def list_product_reviews(
    product_id: str,
    limit: int = Query(default=5, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ReviewListResponse:
    product = product_service.get_product(db, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    items, total = product_service.list_reviews(db, product_id, limit=limit, offset=offset)
    breakdown = product_service.rating_breakdown(product.rating, product.reviews)

    return ReviewListResponse(
        items=[ReviewRead.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
        average_rating=product.rating,
        review_count=product.reviews,
        rating_breakdown=breakdown,
    )
