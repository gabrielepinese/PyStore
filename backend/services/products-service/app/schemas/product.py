from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ProductRead(BaseModel):
    """Public product representation, camelCased on the wire to match the
    Angular Product model."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: str
    name: str
    category: str
    description: str | None = None
    price: float
    original_price: float | None = None
    rating: float
    reviews: int
    stock: int
    badge: str | None = None
    accent: str
    created_at: datetime


class ProductListResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    items: list[ProductRead]
    total: int
    limit: int
    offset: int


class CategorySummary(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    product_count: int
    min_price: float
    max_price: float
    avg_rating: float
    on_sale_count: int
    featured_product: str | None = None
    accents: list[str]


class BadgeFacet(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    count: int


class ProductFacets(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    price_min: float
    price_max: float
    price_histogram: list[int]
    badges: list[BadgeFacet]
    on_sale_count: int


class ReviewRead(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: str
    product_id: str
    author: str
    rating: int
    title: str
    body: str
    created_at: datetime


class ReviewListResponse(BaseModel):
    """Paginated reviews for a product plus the aggregate overview the
    reviews tab's summary card needs, so the frontend doesn't need a second
    round trip just to render star-breakdown bars."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    items: list[ReviewRead]
    total: int
    limit: int
    offset: int
    average_rating: float
    review_count: int
    rating_breakdown: dict[int, int]
