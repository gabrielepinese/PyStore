import jwt
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()


class DecodedToken(BaseModel):
    sub: str  # user id
    type: str


def decode_access_token(token: str) -> DecodedToken:
    """Raises jwt.PyJWTError (expired/invalid signature/malformed) on failure.

    This service has no user table of its own — it only verifies tokens
    auth-service signed, using the same shared secret, and trusts the `sub`
    claim as the user id. It never issues tokens itself.
    """
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    return DecodedToken.model_validate(payload)
