from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class UserRead(BaseModel):
    """Public user representation — never includes hashed_password. Field
    names are camelCased on the wire to match the Angular UserModel."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: str
    email: str
    full_name: str
    last_name: str | None = None
    phone: str | None = None
    country: str | None = None
    city: str | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    """Profile fields the user can edit themselves. Email is intentionally
    excluded — changing it would need re-verification, which this demo
    doesn't implement."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    full_name: str = Field(min_length=2)
    last_name: str | None = None
    phone: str | None = None
    country: str | None = None
    city: str | None = None
