from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel

from app.schemas.user import UserRead


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LoginRequest(_CamelModel):
    email: EmailStr
    password: str


class RegisterRequest(_CamelModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)


class TokenResponse(_CamelModel):
    """Internal shape produced by token_service — never sent to the client
    as-is: the refresh token goes out as an httpOnly cookie, never in JSON."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access_token expiry


class AccessTokenResponse(_CamelModel):
    """What actually goes in the response body."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(AccessTokenResponse):
    user: UserRead
