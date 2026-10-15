import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_id(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> str:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        decoded = decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise unauthorized from exc

    if decoded.type != "access":
        raise unauthorized

    return decoded.sub
