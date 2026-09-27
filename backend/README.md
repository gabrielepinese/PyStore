# backend

Microservices backend for the dumbECommerce portfolio project. Each service
under `services/` is an independent FastAPI app with its own dependencies,
database, and Dockerfile — no shared code or shared DB between them.

## Services

| Service        | Status        | Responsibility                          |
|----------------|---------------|-------------------------------------------|
| `auth-service` | ✅ implemented | Registration, login, JWT issuing/refresh |
| `products-service` | 🗒 planned | Catalog: products, categories, search    |
| `cart-service`     | 🗒 planned | Per-user cart state                      |
| `orders-service`   | 🗒 planned | Checkout, order history                  |
| API gateway        | 🗒 planned | Single entry point, routes to services, auth check | 

Only `auth-service` is scaffolded so far, matching the current project
scope (login/auth only). Planned services aren't stubbed out empty — they'll
get scaffolded when their turn comes, following the same layout as
`auth-service` (`app/api`, `app/core`, `app/db`, `app/models`, `app/schemas`,
`app/services`).

## Local dev

Right now there's no docker-compose / gateway wiring — each service runs
standalone on its own port (`auth-service` → `:8001`). See
[`services/auth-service/README.md`](services/auth-service/README.md).
