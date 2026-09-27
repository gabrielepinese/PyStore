from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserRead
from app.services import token_service, user_service

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path=settings.refresh_cookie_path,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=settings.refresh_cookie_path,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
    )


def _to_access_response(tokens: TokenResponse) -> AccessTokenResponse:
    return AccessTokenResponse(
        access_token=tokens.access_token, expires_in=tokens.expires_in
    )


@router.post(
    "/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED
)
def register(
    payload: RegisterRequest, response: Response, db: Session = Depends(get_db)
) -> AuthResponse:
    try:
        user = user_service.create_user(db, payload)
    except user_service.EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        ) from exc

    tokens = token_service.issue_token_pair(db, user)
    _set_refresh_cookie(response, tokens.refresh_token)
    return AuthResponse(
        **_to_access_response(tokens).model_dump(), user=UserRead.model_validate(user)
    )


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest, response: Response, db: Session = Depends(get_db)
) -> AuthResponse:
    user = user_service.authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    tokens = token_service.issue_token_pair(db, user)
    _set_refresh_cookie(response, tokens.refresh_token)
    return AuthResponse(
        **_to_access_response(tokens).model_dump(), user=UserRead.model_validate(user)
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(
        default=None, alias=settings.refresh_cookie_name
    ),
    db: Session = Depends(get_db),
) -> AccessTokenResponse:
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token"
        )

    try:
        tokens = token_service.rotate_refresh_token(db, refresh_token)
    except token_service.InvalidRefreshTokenError as exc:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc

    _set_refresh_cookie(response, tokens.refresh_token)
    return _to_access_response(tokens)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    refresh_token: str | None = Cookie(
        default=None, alias=settings.refresh_cookie_name
    ),
    db: Session = Depends(get_db),
) -> None:
    if refresh_token is not None:
        token_service.revoke_refresh_token(db, refresh_token)
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)
