from typing import Literal

from sqlalchemy import Select, and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.product import Product
from app.models.review import Review
from app.schemas.product import BadgeFacet, CategorySummary, ProductFacets

settings = get_settings()

SortKey = Literal["newest", "price_asc", "price_desc", "rating", "popular", "discount"]

_ON_SALE = and_(Product.original_price.is_not(None), Product.original_price > Product.price)
_DISCOUNT_RATIO = case(
    (_ON_SALE, (Product.original_price - Product.price) / Product.original_price),
    else_=0.0,
)

_ORDER_BY = {
    "newest": (Product.created_at.desc(),),
    "price_asc": (Product.price.asc(),),
    "price_desc": (Product.price.desc(),),
    "rating": (Product.rating.desc(), Product.reviews.desc()),
    "popular": (Product.reviews.desc(),),
    "discount": (_DISCOUNT_RATIO.desc(),),
}


def _apply_filters(
    stmt: Select,
    *,
    category: str | None = None,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_rating: float | None = None,
    on_sale: bool = False,
    badge: str | None = None,
) -> Select:
    if category and category.lower() != "all":
        stmt = stmt.where(Product.category == category)

    if search and search.strip():
        pattern = f"%{search.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(Product.name).like(pattern), func.lower(Product.category).like(pattern)))

    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)
    if min_rating is not None:
        stmt = stmt.where(Product.rating >= min_rating)
    if on_sale:
        stmt = stmt.where(_ON_SALE)
    if badge:
        stmt = stmt.where(func.lower(Product.badge) == badge.strip().lower())

    return stmt


def list_products(
    db: Session,
    category: str | None = None,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_rating: float | None = None,
    on_sale: bool = False,
    badge: str | None = None,
    sort: SortKey = "newest",
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[Product], int]:
    filters = dict(
        category=category,
        search=search,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        on_sale=on_sale,
        badge=badge,
    )

    total = db.scalar(_apply_filters(select(func.count()).select_from(Product), **filters)) or 0

    page_size = min(limit or settings.default_page_size, settings.max_page_size)
    # Product.id as final tie-breaker keeps pagination stable when the sort key ties.
    stmt = (
        _apply_filters(select(Product), **filters)
        .order_by(*_ORDER_BY[sort], Product.id)
        .offset(offset)
        .limit(page_size)
    )
    items = list(db.scalars(stmt).all())

    return items, total


def get_product(db: Session, product_id: str) -> Product | None:
    return db.get(Product, product_id)


def list_categories(db: Session) -> list[str]:
    rows = db.query(Product.category).distinct().order_by(Product.category).all()
    return [row[0] for row in rows]


def category_summaries(db: Session) -> list[CategorySummary]:
    """One row per category with the aggregates the dashboard's category tiles
    need. Biggest categories first so the UI can give them the largest tiles."""
    aggregates = db.execute(
        select(
            Product.category,
            func.count(Product.id),
            func.min(Product.price),
            func.max(Product.price),
            func.avg(Product.rating),
            func.sum(case((_ON_SALE, 1), else_=0)),
        ).group_by(Product.category)
    ).all()

    # Most-reviewed products first → first row per category is its "featured" one.
    samples = db.execute(
        select(Product.category, Product.name, Product.accent).order_by(Product.reviews.desc(), Product.id)
    ).all()
    featured: dict[str, str] = {}
    accents: dict[str, list[str]] = {}
    for category, name, accent in samples:
        featured.setdefault(category, name)
        bucket = accents.setdefault(category, [])
        if accent not in bucket and len(bucket) < 3:
            bucket.append(accent)

    summaries = [
        CategorySummary(
            name=category,
            product_count=count,
            min_price=min_price,
            max_price=max_price,
            avg_rating=round(avg_rating or 0, 1),
            on_sale_count=int(on_sale_count or 0),
            featured_product=featured.get(category),
            accents=accents.get(category, []),
        )
        for category, count, min_price, max_price, avg_rating, on_sale_count in aggregates
    ]
    summaries.sort(key=lambda s: (-s.product_count, s.name))
    return summaries


def facets(db: Session, category: str | None = None, search: str | None = None) -> ProductFacets:
    """Ranges/values the filter UI can offer for the current category/search
    scope — computed *without* the other filters applied so the controls
    don't shrink as the user narrows things down."""
    scope = dict(category=category, search=search)

    price_min, price_max = db.execute(
        _apply_filters(select(func.min(Product.price), func.max(Product.price)), **scope)
    ).one()

    badge_rows = db.execute(
        _apply_filters(select(Product.badge, func.count(Product.id)), **scope)
        .where(Product.badge.is_not(None))
        .group_by(Product.badge)
        .order_by(func.count(Product.id).desc(), Product.badge)
    ).all()

    on_sale_count = (
        db.scalar(_apply_filters(select(func.count()).select_from(Product), **scope).where(_ON_SALE)) or 0
    )

    return ProductFacets(
        price_min=price_min or 0,
        price_max=price_max or 0,
        badges=[BadgeFacet(name=name, count=count) for name, count in badge_rows],
        on_sale_count=on_sale_count,
    )


def list_reviews(
    db: Session, product_id: str, limit: int, offset: int
) -> tuple[list[Review], int]:
    total = (
        db.scalar(
            select(func.count()).select_from(Review).where(Review.product_id == product_id)
        )
        or 0
    )

    stmt = (
        select(Review)
        .where(Review.product_id == product_id)
        .order_by(Review.created_at.desc(), Review.id)
        .offset(offset)
        .limit(limit)
    )
    items = list(db.scalars(stmt).all())

    return items, total


def rating_breakdown(rating: float, total: int) -> dict[int, int]:
    """Synthesize a plausible 1-5 star distribution for the overview bars.

    We only store one aggregate `rating` per product (not a running tally per
    star), so this derives a deterministic, triangular-shaped distribution
    centered on that rating rather than requiring real per-star counts."""
    stars = range(5, 0, -1)
    if total <= 0:
        return {star: 0 for star in stars}

    clamped = max(1.0, min(5.0, rating))
    # Small floor weight keeps even a 5-star-rated product showing a sliver of
    # low-star reviews, which reads as more believable than an all-or-nothing split.
    weights = {star: max(0.02, 1 - abs(star - clamped) * 0.6) for star in stars}
    weight_sum = sum(weights.values())
    raw = {star: (weight / weight_sum) * total for star, weight in weights.items()}

    counts = {star: int(value) for star, value in raw.items()}
    remainder = total - sum(counts.values())

    # Hand out leftover units to whichever stars have the largest fractional
    # part (ties broken by proximity to the real rating) until the counts sum
    # back up to `total` exactly.
    order = sorted(raw, key=lambda star: (-(raw[star] - counts[star]), abs(star - clamped)))
    for star in order[:remainder]:
        counts[star] += 1

    return dict(sorted(counts.items(), key=lambda kv: kv[0], reverse=True))
