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
