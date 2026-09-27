from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Service-local configuration, loaded from environment variables / a .env
    file. Each microservice owns its own Settings + .env — nothing here is
    shared process state with other services.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- service ---
    service_name: str = "auth-service"
    api_v1_prefix: str = "/api/v1"

    # --- database ---
    # SQLite by default so the service runs with zero external infra for
    # local dev / portfolio demo purposes. Point this at Postgres in
    # docker-compose / production via the DATABASE_URL env var, e.g.:
    # postgresql+psycopg://user:pass@host:5432/auth
    database_url: str = "sqlite:///./auth.db"

    # --- JWT ---
    # NEVER use this default outside local dev. Override via JWT_SECRET_KEY.
    jwt_secret_key: str = "dev-only-insecure-secret-change-me-please-really"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # --- CORS ---
    cors_origins: list[str] = ["http://localhost:4200"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
