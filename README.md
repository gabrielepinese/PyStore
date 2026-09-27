# dumbECommerce

Mock ecommerce built for a portfolio. Angular frontend, Python
microservices backend. Currently scaffolded: login/registration + JWT
authentication end to end — the rest of the store (catalog, cart, orders)
comes later.

## Structure

```
frontend/   Angular 22 app (standalone, zoneless, signals)
backend/    Python microservices — see backend/README.md
```

## Frontend

```bash
cd frontend
npm install
npm start        # http://localhost:4200
```

Auth-related code lives under `src/app/core/auth` (service, guards, token
storage) and `src/app/core/interceptors` (attaches the bearer token,
handles 401s). Login/register screens are in `src/app/features/auth`; a
`dashboard` stub demonstrates a route guarded by `authGuard`.

## Backend

```bash
cd backend/services/auth-service
python -m venv .venv && ./.venv/Scripts/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001   # http://localhost:8001/docs
```

See [`backend/README.md`](backend/README.md) for the intended
microservices layout and [`backend/services/auth-service/README.md`](backend/services/auth-service/README.md)
for the auth service specifically.
