from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.product import Product

settings = get_settings()


def list_products(
    db: Session,
    category: str | None = None,
    search: str | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[Product], int]:
    query = db.query(Product)

    if category and category.lower() != "all":
        query = query.filter(Product.category == category)

    if search:
        pattern = f"%{search.strip().lower()}%"
        query = query.filter(func.lower(Product.name).like(pattern))

    total = query.count()

    page_size = min(limit or settings.default_page_size, settings.max_page_size)
    items = query.order_by(Product.created_at.desc()).offset(offset).limit(page_size).all()

    return items, total


def get_product(db: Session, product_id: str) -> Product | None:
    return db.query(Product).filter(Product.id == product_id).first()


def list_categories(db: Session) -> list[str]:
    rows = db.query(Product.category).distinct().order_by(Product.category).all()
    return [row[0] for row in rows]
