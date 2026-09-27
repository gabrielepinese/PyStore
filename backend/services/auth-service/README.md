# auth-service

FastAPI microservice owning user identity: registration, login, JWT
access/refresh tokens, session revocation. Owns its own database — no other
service should read its tables directly; everything crosses the wire as
JSON through this service's API.

## Stack

- FastAPI + Pydantic v2 (request/response models, camelCase on the wire to
  match the Angular frontend)
- SQLAlchemy 2.0, sync engine — SQLite by default (zero-setup local dev),
  swap to Postgres via `DATABASE_URL`
- PyJWT for access/refresh tokens, `bcrypt` for password hashing
- Refresh tokens are tracked server-side (`refresh_tokens` table, keyed by
  the JWT's `jti`) so a single session can be revoked without a token
  blocklist keyed on the raw JWT — rotated on every `/refresh` call

## Run locally

```bash
python -m venv .venv
./.venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # then edit JWT_SECRET_KEY at least
uvicorn app.main:app --reload --port 8001
```

API docs: http://localhost:8001/docs

## Endpoints (`/api/v1/auth`)

| Method | Path       | Auth           | Notes                                   |
|--------|------------|----------------|------------------------------------------|
| POST   | `/register`| —              | Creates user, returns token pair + user |
| POST   | `/login`   | —              | Returns token pair + user               |
| POST   | `/refresh` | refresh token  | Rotates refresh token                   |
| POST   | `/logout`  | refresh token  | Revokes the given refresh token         |
| GET    | `/me`      | access token   | Returns the current user                |

## Tests

```bash
pytest
```

`tests/test_auth_flow.py` drives the full flow against a throwaway SQLite
file: register → duplicate-email rejection → login → wrong-password
rejection → `/me` with/without a token → refresh rotation → rotated-token
reuse rejection → logout → refresh-after-logout rejection.

## Not done yet (by design — scope is auth only for now)

- Alembic migrations (schema is created via `create_all` for dev/demo)
- Postgres in docker-compose (works today via `DATABASE_URL`, just not wired)
- Rate limiting / account lockout on repeated failed logins
- Email verification / password reset flows
- The other microservices this structure implies (`products-service`,
  `cart-service`, `orders-service`, an API gateway in front of all of
  them) — `backend/README.md` sketches the intended shape.
