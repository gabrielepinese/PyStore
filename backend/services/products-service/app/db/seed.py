from sqlalchemy.orm import Session

from app.models.product import Product

# Mirrors the mock catalog the Angular dashboard shipped with before this
# service existed, so swapping the frontend over to real data is a drop-in
# change. Dev/demo seed only — a real deployment would load this via a
# proper import pipeline, not module-level constants.
SEED_PRODUCTS: list[dict] = [
    {"id": "p1", "name": "Ceramic Pour-Over Set", "category": "Home", "price": 38, "original_price": 48, "rating": 4.5, "reviews": 214, "badge": "Bestseller", "accent": "#7a3018"},
    {"id": "p2", "name": "Recycled Wool Throw", "category": "Home", "price": 64, "original_price": None, "rating": 4.8, "reviews": 96, "badge": None, "accent": "#c5a059"},
    {"id": "p3", "name": "Wireless Noise-Cancel Headphones", "category": "Electronics", "price": 129, "original_price": 159, "rating": 4.6, "reviews": 1032, "badge": "Sale", "accent": "#1a1a1a"},
    {"id": "p4", "name": "Mechanical Keyboard 75%", "category": "Electronics", "price": 89, "original_price": None, "rating": 4.4, "reviews": 421, "badge": None, "accent": "#5c2311"},
    {"id": "p5", "name": "Linen Weekend Shirt", "category": "Fashion", "price": 54, "original_price": None, "rating": 4.2, "reviews": 88, "badge": "New", "accent": "#f2cbb6"},
    {"id": "p6", "name": "Suede Chelsea Boots", "category": "Fashion", "price": 118, "original_price": None, "rating": 4.7, "reviews": 305, "badge": None, "accent": "#7a3018"},
    {"id": "p7", "name": "Vitamin C Serum", "category": "Beauty", "price": 24, "original_price": 30, "rating": 4.3, "reviews": 512, "badge": "Sale", "accent": "#c5a059"},
    {"id": "p8", "name": "Clay Face Mask Trio", "category": "Beauty", "price": 32, "original_price": None, "rating": 4.1, "reviews": 76, "badge": None, "accent": "#e6e1d8"},
    {"id": "p9", "name": "Foldable Yoga Mat", "category": "Sports", "price": 42, "original_price": None, "rating": 4.6, "reviews": 267, "badge": None, "accent": "#5c2311"},
    {"id": "p10", "name": "Insulated Water Bottle", "category": "Sports", "price": 22, "original_price": None, "rating": 4.9, "reviews": 891, "badge": "Bestseller", "accent": "#1a1a1a"},
    {"id": "p11", "name": "Leather Journal Notebook", "category": "Home", "price": 19, "original_price": None, "rating": 4.4, "reviews": 143, "badge": None, "accent": "#c5a059"},
    {"id": "p12", "name": "Smart LED Desk Lamp", "category": "Electronics", "price": 46, "original_price": None, "rating": 4.5, "reviews": 198, "badge": "New", "accent": "#7a3018"},
]


def seed_products(db: Session) -> None:
    if db.query(Product).count() > 0:
        return

    db.add_all(Product(**data) for data in SEED_PRODUCTS)
    db.commit()
