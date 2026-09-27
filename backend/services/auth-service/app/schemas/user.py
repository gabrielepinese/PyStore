from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class UserRead(BaseModel):
    """Public user representation — never includes hashed_password. Field
    names are camelCased on the wire to match the Angular UserModel."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: str
    email: str
    full_name: str
    created_at: datetime
