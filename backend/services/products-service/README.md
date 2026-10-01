# products-service

FastAPI microservice owning the product catalog: listing, category filtering,
search, single-product lookup. Owns its own database — no other service
should read its tables directly; everything crosses the wire as JSON through
this service's API.

## Stack

- FastAPI + Pydantic v2 (request/response models, camelCase on the wire to
  match the Angular frontend)
- SQLAlchemy 2.0, sync engine — SQLite by default (zero-setup local dev),
  swap to Postgres via `DATABASE_URL`
- No auth on reads — the catalog is public. Write endpoints (create/update
  products) aren't implemented yet; see "Not done yet" below.

## Run locally

```bash
python -m venv .venv
./.venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8002
```

API docs: http://localhost:8002/docs

On first startup the service seeds itself with the same 12 demo products the
Angular dashboard used to hardcode, so the frontend can be pointed at this
service with no other setup.

## Endpoints (`/api/v1/products`)

| Method | Path                 | Notes |
|--------|----------------------|-------|
| GET    | `/`                  | List products (filters below) |
| GET    | `/categories`        | Distinct category names |
| GET    | `/categories/summary`| Per-category aggregates for the dashboard tiles: `productCount`, `minPrice`, `maxPrice`, `avgRating`, `onSaleCount`, `featuredProduct`, `accents`. Biggest category first |
| GET    | `/facets`            | Filter-UI hints for a `category`/`search` scope: `priceMin`, `priceMax`, `badges[{name,count}]`, `onSaleCount` |
| GET    | `/{id}`              | Single product, 404 if missing |

Every product carries `description` and `stock`. Both are display-only fields —
`stock` is never aggregated into `/categories/summary` or `/facets`, so
inventory levels don't skew the analytics those endpoints feed.

`GET /` query params (all optional, all combinable):

| Param       | Notes |
|-------------|-------|
| `category`  | Exact match; omit or `All` for every category |
| `search`    | Case-insensitive substring on name **or** category |
| `minPrice` / `maxPrice` | Inclusive price bounds (422 if min > max) |
| `minRating` | 0–5, inclusive |
| `onSale`    | `true` → only products with `originalPrice > price` |
| `badge`     | Case-insensitive badge match (`New`, `Sale`, `Bestseller`) |
| `sort`      | `newest` (default), `price_asc`, `price_desc`, `rating`, `popular`, `discount` |
| `limit` / `offset` | Pagination (`limit` max 100) |

## Tests

```bash
pytest
```

## Not done yet (by design — scope is read-only catalog for now)

- Create/update/delete endpoints (admin-only, would need the gateway's auth
  check in front of them)
- Alembic migrations (schema is created via `create_all` for dev/demo)
- Postgres in docker-compose (works today via `DATABASE_URL`, just not wired)
- Product images (frontend renders a flat `accent` color swatch instead)
