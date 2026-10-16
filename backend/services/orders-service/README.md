# orders-service

**v1.0.0** — FastAPI microservice owning checkout: turning a cart into an order and
taking payment through Stripe (test mode). Owns its own database — no
other service should read its tables directly.

## Stack

- FastAPI + Pydantic v2 (request/response models, camelCase on the wire to
  match the Angular frontend)
- SQLAlchemy 2.0, sync engine — SQLite by default, swap to Postgres via
  `DATABASE_URL`
- No user table of its own. It verifies the JWT auth-service issued (same
  shared secret, `PyJWT`) and trusts the `sub` claim as the user id — it
  never mints tokens itself.
- `httpx` to re-fetch each line item's price/stock from `products-service`
  at order time, so a tampered cart payload from the client can't under- or
  over-charge.
- `stripe` (official Python SDK) for payment — PaymentIntents, test mode
  only.

## Payment flow

1. `POST /orders` re-prices the cart against products-service, opens a
   Stripe `PaymentIntent` for the verified total, and returns the order
   plus the intent's `client_secret`.
2. The frontend confirms the card with Stripe.js directly in the browser
   (`stripe.confirmPayment`) — the card number never reaches this backend.
3. `POST /orders/{id}/confirm` re-checks the PaymentIntent status directly
   with Stripe's API (never trusts the client's say-so) and marks the order
   paid.
4. `POST /webhooks/stripe` is the belt-and-suspenders path: if a client goes
   offline right after Stripe charges the card, this is what actually
   guarantees the order gets marked paid server-side. Needs `STRIPE_WEBHOOK_SECRET`
   and the Stripe CLI forwarding events to it locally — skip it, the
   primary flow above works without it.

## Run locally

```bash
python -m venv .venv
./.venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # then set JWT_SECRET_KEY to match auth-service's,
                                 # and STRIPE_SECRET_KEY to your own test key
uvicorn app.main:app --reload --port 8003
```

Needs `products-service` running too (`PRODUCTS_SERVICE_URL`, default
`http://localhost:8002/api/v1`) since every order re-fetches prices from it.

Without `STRIPE_SECRET_KEY` set, `POST /orders` still runs the price/stock
validation but fails at the Stripe call with `502 Payment provider error` —
useful to know that's expected until a real test key is configured. Get a
free one (no business verification needed for test mode) at
https://dashboard.stripe.com/register →
https://dashboard.stripe.com/test/apikeys.

API docs: http://localhost:8003/docs

## Endpoints (`/api/v1/orders`)

| Method | Path                | Notes |
|--------|---------------------|-------|
| POST   | `/`                 | Create an order from cart items + a shipping address snapshot. Returns `{ order, clientSecret }` |
| POST   | `/{id}/confirm`     | Re-checks payment status with Stripe, marks the order `paid` |
| GET    | `/`                 | List the current user's orders |
| GET    | `/{id}`             | Single order, 404 if missing or not owned by the caller |

`/api/v1/webhooks/stripe` handles `payment_intent.succeeded` /
`payment_intent.payment_failed` events (optional, see above).

## Tests

```bash
pytest
```

Stripe and the products-service HTTP call are both mocked — tests run
offline, no real API key needed.

## Not done yet (by design — scope is a working mock checkout)

- Tax/shipping cost calculation (`total` == `subtotal`)
- Inventory decrement on successful payment (stock is only read, never
  reduced)
- Alembic migrations (schema is created via `create_all` for dev/demo)
- Idempotency keys on `POST /orders` (a double-click creates two orders,
  each with its own PaymentIntent)
