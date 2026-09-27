# backend

Microservices backend for the dumbECommerce portfolio project. Each service
under `services/` is an independent FastAPI app with its own dependencies,
database, and Dockerfile — no shared code or shared DB between them.

## Services

| Service        | Status        | Responsibility                          |
|----------------|---------------|-------------------------------------------|
| `auth-service` | ✅ implemented | Registration, login, JWT issuing/refresh |
| `products-service` | ✅ implemented | Catalog: products, categories, search |
| `cart-service`     | 🗒 planned | Per-user cart state                      |
| `orders-service`   | 🗒 planned | Checkout, order history                  |
| API gateway        | 🗒 planned | Single entry point, routes to services, auth check | 

Planned services aren't stubbed out empty — they'll get scaffolded when
their turn comes, following the same layout as the implemented ones
(`app/api`, `app/core`, `app/db`, `app/models`, `app/schemas`, `app/services`).

## Local dev

Run everything at once via the root [`docker-compose.yml`](../docker-compose.yml)
(`docker compose up --build`), or each service standalone on its own port
(`auth-service` → `:8001`, `products-service` → `:8002`) — see
[`services/auth-service/README.md`](services/auth-service/README.md) and
[`services/products-service/README.md`](services/products-service/README.md).
No API gateway yet either way.
