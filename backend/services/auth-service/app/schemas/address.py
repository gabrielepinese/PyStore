from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AddressRead(_CamelModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: str
    label: str
    full_name: str
    phone: str | None = None
    line1: str
    line2: str | None = None
    city: str
    postal_code: str
    country: str
    is_default: bool
    created_at: datetime


class AddressWrite(_CamelModel):
    label: str = Field(min_length=1, max_length=50)
    full_name: str = Field(min_length=2)
    phone: str | None = None
    line1: str = Field(min_length=1)
    line2: str | None = None
    city: str = Field(min_length=1)
    postal_code: str = Field(min_length=1)
    country: str = Field(min_length=1)
    is_default: bool = False
