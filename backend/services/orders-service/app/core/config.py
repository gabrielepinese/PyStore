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
    service_name: str = "orders-service"
    api_v1_prefix: str = "/api/v1"

    # --- database ---
    database_url: str = "sqlite:///./orders.db"

    # --- JWT ---
    # Must match auth-service's JWT_SECRET_KEY — this service only verifies
    # tokens auth-service issued, it never mints its own.
    jwt_secret_key: str = "dev-only-insecure-secret-change-me-please-really"
    jwt_algorithm: str = "HS256"

    # --- products-service (server-to-server) ---
    # Prices are re-fetched here at order time rather than trusted from the
    # client, so a tampered cart payload can't under-charge or over-charge.
    products_service_url: str = "http://localhost:8002/api/v1"

    # --- Stripe ---
    # Test-mode keys only (sk_test_... / whsec_...) — this is a learning
    # project, never wire a live key into it.
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # --- CORS ---
    cors_origins: list[str] = ["http://localhost:4200"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
