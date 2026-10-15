from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class OrderItemIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    product_id: str
    qty: int = Field(ge=1)


class ShippingAddressIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    full_name: str
    line1: str
    line2: str | None = None
    city: str
    postal_code: str
    country: str
    phone: str | None = None


class OrderCreateRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    items: list[OrderItemIn]
    shipping_address: ShippingAddressIn


class OrderItemRead(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: str
    product_id: str
    name: str
    unit_price: float
    qty: int


class OrderRead(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: str
    status: str
    currency: str
    subtotal: float
    total: float
    created_at: datetime
    items: list[OrderItemRead]


class OrderCreateResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    order: OrderRead
    client_secret: str
