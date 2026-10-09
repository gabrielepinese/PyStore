# PyStore

Mock ecommerce built for a portfolio. Angular frontend, Python
microservices backend. Currently scaffolded: login/registration + JWT
authentication, and a product catalog (list/filter/search) — cart and
orders come later.

## Structure

```
frontend/   Angular 22 app (standalone, zoneless, signals)
backend/    Python microservices — see backend/README.md
```

## Run everything with Docker Compose

```bash
cp .env.example .env    # then edit AUTH_JWT_SECRET_KEY
docker compose up --build
```

Starts `auth-service` (`:8001`), `products-service` (`:8002`) and the
Angular dev server (`:4200`) together, each with source bind-mounted for
hot reload. Rebuild (`--build`) after changing a service's dependencies
(`requirements.txt` / `package.json`); code-only changes hot-reload without
it.

## Frontend (standalone)

```bash
cd frontend
npm install
npm start        # http://localhost:4200
```

Auth-related code lives under `src/app/core/auth` (service, guards, token
storage) and `src/app/core/interceptors` (attaches the bearer token,
handles 401s). Login/register screens are in `src/app/features/auth`; the
`dashboard` route (guarded by `authGuard`) renders the product catalog via
`src/app/core/products/product.service.ts`.

## Backend (standalone)

Each service runs independently — no gateway yet, so point the frontend at
whichever ones you start:

```bash
cd backend/services/auth-service      # or products-service
python -m venv .venv && ./.venv/Scripts/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001   # 8002 for products-service
```

See [`backend/README.md`](backend/README.md) for the intended
microservices layout and each service's own README
([auth-service](backend/services/auth-service/README.md),
[products-service](backend/services/products-service/README.md)) for specifics.
