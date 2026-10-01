from sqlalchemy.orm import Session

from app.models.product import Product

# Mirrors the mock catalog the Angular dashboard shipped with before this
# service existed, so swapping the frontend over to real data is a drop-in
# change. Dev/demo seed only — a real deployment would load this via a
# proper import pipeline, not module-level constants.
SEED_PRODUCTS: list[dict] = [
    {"id": "p1", "name": "Ceramic Pour-Over Set", "category": "Home", "description": "Hand-glazed stoneware dripper that slows the pour for a cleaner, sweeter cup.", "price": 38, "original_price": 48, "rating": 4.5, "reviews": 214, "stock": 42, "badge": "Bestseller", "accent": "#7a3018"},
    {"id": "p2", "name": "Recycled Wool Throw", "category": "Home", "description": "Woven from reclaimed wool fibers, soft enough for daily use on the couch or bed.", "price": 64, "original_price": None, "rating": 4.8, "reviews": 96, "stock": 17, "badge": None, "accent": "#c5a059"},
    {"id": "p3", "name": "Wireless Noise-Cancel Headphones", "category": "Electronics", "description": "Active noise cancelling with 30-hour battery life for commutes and focus sessions.", "price": 129, "original_price": 159, "rating": 4.6, "reviews": 1032, "stock": 58, "badge": "Sale", "accent": "#1a1a1a"},
    {"id": "p4", "name": "Mechanical Keyboard 75%", "category": "Electronics", "description": "Hot-swappable switches and a compact 75% layout built for long typing sessions.", "price": 89, "original_price": None, "rating": 4.4, "reviews": 421, "stock": 31, "badge": None, "accent": "#5c2311"},
    {"id": "p5", "name": "Linen Weekend Shirt", "category": "Fashion", "description": "Breathable linen cut for warm weather, pairs easily with jeans or shorts.", "price": 54, "original_price": None, "rating": 4.2, "reviews": 88, "stock": 24, "badge": "New", "accent": "#f2cbb6"},
    {"id": "p6", "name": "Suede Chelsea Boots", "category": "Fashion", "description": "Classic Chelsea silhouette in brushed suede with a durable rubber sole.", "price": 118, "original_price": 139, "rating": 4.7, "reviews": 305, "stock": 12, "badge": None, "accent": "#7a3018"},
    {"id": "p7", "name": "Vitamin C Serum", "category": "Beauty", "description": "Brightening serum with stabilized vitamin C for daily morning use.", "price": 24, "original_price": 30, "rating": 4.3, "reviews": 512, "stock": 67, "badge": "Sale", "accent": "#c5a059"},
    {"id": "p8", "name": "Clay Face Mask Trio", "category": "Beauty", "description": "Three mineral clay masks for oily, dry, and combination skin.", "price": 32, "original_price": None, "rating": 4.1, "reviews": 76, "stock": 29, "badge": None, "accent": "#e6e1d8"},
    {"id": "p9", "name": "Foldable Yoga Mat", "category": "Sports", "description": "Travel-friendly mat that folds flat, with a non-slip textured surface.", "price": 42, "original_price": 52, "rating": 4.6, "reviews": 267, "stock": 38, "badge": None, "accent": "#5c2311"},
    {"id": "p10", "name": "Insulated Water Bottle", "category": "Sports", "description": "Double-wall stainless steel keeps drinks cold for 24 hours or hot for 12.", "price": 22, "original_price": None, "rating": 4.9, "reviews": 891, "stock": 94, "badge": "Bestseller", "accent": "#1a1a1a"},
    {"id": "p11", "name": "Leather Journal Notebook", "category": "Home", "description": "Refillable leather cover with 192 pages of thick, pen-friendly paper.", "price": 19, "original_price": 25, "rating": 4.4, "reviews": 143, "stock": 51, "badge": None, "accent": "#c5a059"},
    {"id": "p12", "name": "Smart LED Desk Lamp", "category": "Electronics", "description": "Adjustable color temperature and brightness with a USB charging port in the base.", "price": 46, "original_price": None, "rating": 4.5, "reviews": 198, "stock": 22, "badge": "New", "accent": "#7a3018"},
]


def seed_products(db: Session) -> None:
    if db.query(Product).count() > 0:
        return

    db.add_all(Product(**data) for data in SEED_PRODUCTS)
    db.commit()
