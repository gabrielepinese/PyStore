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

| Method | Path         | Notes                                                        |
|--------|--------------|---------------------------------------------------------------|
| GET    | `/`          | List products. Query params: `category`, `search`, `limit`, `offset` |
| GET    | `/categories`| Distinct category names                                       |
| GET    | `/{id}`      | Single product, 404 if missing                                 |

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
