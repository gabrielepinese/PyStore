import httpx
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()


class ProductLookupError(Exception):
    """products-service is unreachable or returned something unexpected."""


class ProductSnapshot(BaseModel):
    id: str
    name: str
    price: float
    stock: int


def get_product(product_id: str) -> ProductSnapshot | None:
    """Re-fetches the product straight from products-service so the order is
    priced off the catalog, never off whatever the client sent — a tampered
    cart payload can't under- or over-charge."""
    try:
        response = httpx.get(f"{settings.products_service_url}/products/{product_id}", timeout=5.0)
    except httpx.HTTPError as exc:
        raise ProductLookupError(f"products-service unreachable: {exc}") from exc

    if response.status_code == 404:
        return None
    if response.is_error:
        raise ProductLookupError(f"products-service returned {response.status_code}")

    data = response.json()
    return ProductSnapshot(id=data["id"], name=data["name"], price=data["price"], stock=data["stock"])
