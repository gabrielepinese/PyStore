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


class RefreshRequest(_CamelModel):
    refresh_token: str


class TokenResponse(_CamelModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access_token expiry


class AuthResponse(TokenResponse):
    user: UserRead
