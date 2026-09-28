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
    price: float
    original_price: float | None = None
    rating: float
    reviews: int
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
    badges: list[BadgeFacet]
    on_sale_count: int
