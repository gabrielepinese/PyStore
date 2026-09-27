from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.products import router as products_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.seed import seed_products
from app.db.session import SessionLocal, engine

# Import models so they register on Base.metadata before create_all runs.
from app.models import product  # noqa: F401

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Dev/demo convenience only — a real deployment manages schema via
    # Alembic migrations instead of create_all.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_products(db)
    finally:
        db.close()

    yield


app = FastAPI(title=settings.service_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.service_name}
