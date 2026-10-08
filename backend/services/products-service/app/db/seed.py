import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.review import Review
from app.services.product_service import rating_breakdown

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


_REVIEW_AUTHORS = [
    "Alex M.", "Jordan P.", "Sam K.", "Taylor R.", "Morgan B.", "Casey L.",
    "Riley T.", "Jamie S.", "Drew H.", "Avery N.", "Quinn F.", "Reese D.",
]

_REVIEW_TITLES_BY_STAR = {
    5: ["Exceeded my expectations", "Exactly what I needed", "Couldn't be happier", "Five stars, would buy again"],
    4: ["Really solid pick", "Happy with this", "Does the job well", "Good value overall"],
    3: ["Does what it says", "Fine, nothing special", "Decent for the price"],
    2: ["Expected more", "A bit disappointing", "Mixed feelings"],
    1: ["Not what I hoped for", "Wouldn't buy again"],
}

_REVIEW_BODIES_BY_STAR = {
    5: [
        "Arrived quickly and the quality is even better than the photos suggested. Already recommended it to a friend.",
        "Been using it daily for weeks now and it still looks brand new. Worth every penny.",
        "This is exactly the kind of quality I was hoping for. No complaints at all.",
    ],
    4: [
        "Good quality overall, just a couple of small details keep it from a perfect score.",
        "Does what it promises, and the packaging was nice too.",
        "Happy with the purchase — only took a star off because of the price.",
    ],
    3: [
        "It's fine. Does the job but nothing stood out as impressive.",
        "Average experience, matches the description but no surprises.",
    ],
    2: [
        "Had higher hopes based on the photos. It works but feels a bit cheaper than expected.",
        "Okay for the price, but I probably wouldn't repurchase.",
    ],
    1: [
        "Didn't match the description and customer support was slow to respond.",
        "Arrived with a defect and the replacement took too long to ship.",
    ],
}


def seed_reviews(db: Session) -> None:
    """Seed a small, believable sample of per-star reviews for each product.

    Dev/demo seed only. The sample size is independent of each product's
    aggregate `reviews` count (that stat represents "all reviews ever", while
    this is just the handful of real review rows the UI can page through)."""
    if db.query(Review).count() > 0:
        return

    rng = random.Random(1234)
    now = datetime.now(timezone.utc)

    for product in db.query(Product).all():
        sample_size = min(12, max(4, product.reviews // 20 + 4))
        breakdown = rating_breakdown(product.rating, sample_size)
        stars = [star for star, count in breakdown.items() for _ in range(count)]
        rng.shuffle(stars)

        for star in stars:
            db.add(
                Review(
                    product_id=product.id,
                    author=rng.choice(_REVIEW_AUTHORS),
                    rating=star,
                    title=rng.choice(_REVIEW_TITLES_BY_STAR[star]),
                    body=rng.choice(_REVIEW_BODIES_BY_STAR[star]),
                    created_at=now - timedelta(days=rng.randint(1, 240), hours=rng.randint(0, 23)),
                )
            )

    db.commit()
