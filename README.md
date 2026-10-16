# PyStore

**v1.0.0** — Mock ecommerce built for a portfolio. Angular frontend, Python
microservices backend. Implemented: login/registration + JWT
authentication, a product catalog (list/filter/search), a client-side cart,
and checkout with real Stripe test-mode payments.

## Structure

```
frontend/   Angular 22 app (standalone, zoneless, signals)
backend/    Python microservices — see backend/README.md
```

## Run everything with Docker Compose

```bash
cp .env.example .env    # then edit AUTH_JWT_SECRET_KEY, and see "Payments" below
docker compose up --build
```

Starts `auth-service` (`:8001`), `products-service` (`:8002`),
`orders-service` (`:8003`) and the Angular dev server (`:4200`) together,
each with source bind-mounted for hot reload. Rebuild (`--build`) after
changing a service's dependencies (`requirements.txt` / `package.json`);
code-only changes hot-reload without it.

## Payments (Stripe test mode)

Checkout uses the real Stripe SDK (`stripe` on the backend, `@stripe/stripe-js`
on the frontend) against test-mode keys — no real money, no real bank
account needed. Two keys, handled differently because only one of them is
actually a secret:

- **`STRIPE_SECRET_KEY`** (`sk_test_...`) — stays server-side, in `.env`
  (already gitignored, see `.env.example`). `docker-compose.yml` passes it
  into `orders-service`. Never put this in frontend code.
- **`stripePublishableKey`** (`pk_test_...`) — meant to ship in the browser
  bundle; Stripe designs it to be public, so editing it directly in
  [`frontend/src/environments/environment.development.ts`](frontend/src/environments/environment.development.ts)
  is safe to commit. If you'd still rather your personal key never show up
  in `git status` after editing that file, tell git to stop tracking local
  changes to it:
  ```bash
  git update-index --skip-worktree frontend/src/environments/environment.development.ts
  ```
  (Undo with `--no-skip-worktree` if you ever need to edit-and-commit it
  again, e.g. to change the default placeholder for everyone.)

Get both keys for free, no business verification required for test mode:
1. Sign up at https://dashboard.stripe.com/register (email + password is enough)
2. Copy the test-mode keys from https://dashboard.stripe.com/test/apikeys
3. Test card for checkout: `4242 4242 4242 4242`, any future expiry, any CVC

Without a configured `STRIPE_SECRET_KEY`, everything up to the Stripe call
still works (cart, address selection, order/price validation) — checkout
just fails at the payment step with a `502 Payment provider error`. See
[`backend/services/orders-service/README.md`](backend/services/orders-service/README.md)
for the service's own setup instructions (standalone, outside Docker).

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
`src/app/core/products/product.service.ts`. The cart (`src/app/core/cart`)
is client-side only, persisted to `localStorage` — there's no cart
microservice. `/cart` and `/checkout` (both `authGuard`-protected) round
out the flow; see "Payments" above for the Stripe setup checkout needs.

## Backend (standalone)

Each service runs independently — no gateway yet, so point the frontend at
whichever ones you start:

```bash
cd backend/services/auth-service      # or products-service / orders-service
python -m venv .venv && ./.venv/Scripts/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001   # 8002 products-service, 8003 orders-service
```

See [`backend/README.md`](backend/README.md) for the intended
microservices layout and each service's own README
([auth-service](backend/services/auth-service/README.md),
[products-service](backend/services/products-service/README.md),
[orders-service](backend/services/orders-service/README.md)) for specifics.
