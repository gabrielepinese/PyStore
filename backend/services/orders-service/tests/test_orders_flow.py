from unittest.mock import MagicMock

import pytest

from app.services import order_service
from app.services.products_client import ProductSnapshot

SHIPPING = {
    "fullName": "Jane Doe",
    "line1": "123 Main St",
    "city": "Springfield",
    "postalCode": "00100",
    "country": "Italy",
}


@pytest.fixture(autouse=True)
def _mock_products(monkeypatch):
    def fake_get_product(product_id: str):
        return ProductSnapshot(id=product_id, name="Test Widget", price=19.99, stock=5)

    monkeypatch.setattr(order_service, "get_product", fake_get_product)


@pytest.fixture(autouse=True)
def _mock_stripe(monkeypatch):
    created = MagicMock(id="pi_test_123", client_secret="pi_test_123_secret_abc")
    monkeypatch.setattr(order_service.stripe.PaymentIntent, "create", lambda **kwargs: created)

    retrieved = MagicMock(status="succeeded")
    monkeypatch.setattr(order_service.stripe.PaymentIntent, "retrieve", lambda id: retrieved)


def _create(client, auth_headers, items=None):
    if items is None:
        items = [{"productId": "p1", "qty": 2}]
    return client.post(
        "/api/v1/orders",
        json={"items": items, "shippingAddress": SHIPPING},
        headers=auth_headers,
    )


def test_create_order_returns_client_secret(client, auth_headers):
    response = _create(client, auth_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["clientSecret"] == "pi_test_123_secret_abc"
    assert body["order"]["status"] == "pending"
    assert body["order"]["subtotal"] == pytest.approx(39.98)
    assert body["order"]["items"][0]["name"] == "Test Widget"


def test_create_order_requires_auth(client):
    response = client.post(
        "/api/v1/orders",
        json={"items": [{"productId": "p1", "qty": 1}], "shippingAddress": SHIPPING},
    )
    assert response.status_code == 401


def test_create_order_rejects_empty_cart(client, auth_headers):
    response = _create(client, auth_headers, items=[])
    assert response.status_code == 422


def test_create_order_rejects_out_of_stock(client, auth_headers, monkeypatch):
    monkeypatch.setattr(
        order_service,
        "get_product",
        lambda product_id: ProductSnapshot(id=product_id, name="Scarce Thing", price=5.0, stock=1),
    )
    response = _create(client, auth_headers, items=[{"productId": "p1", "qty": 2}])
    assert response.status_code == 409


def test_create_order_rejects_unknown_product(client, auth_headers, monkeypatch):
    monkeypatch.setattr(order_service, "get_product", lambda product_id: None)
    response = _create(client, auth_headers)
    assert response.status_code == 404


def test_confirm_order_marks_paid(client, auth_headers):
    order_id = _create(client, auth_headers).json()["order"]["id"]

    response = client.post(f"/api/v1/orders/{order_id}/confirm", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["status"] == "paid"


def test_confirm_order_blocks_other_users(client, auth_headers, make_auth_headers):
    order_id = _create(client, auth_headers).json()["order"]["id"]

    response = client.post(
        f"/api/v1/orders/{order_id}/confirm", headers=make_auth_headers("someone-else")
    )

    assert response.status_code == 404


def test_list_orders_scoped_to_user(client, auth_headers, make_auth_headers):
    _create(client, auth_headers)

    own = client.get("/api/v1/orders", headers=auth_headers)
    other = client.get("/api/v1/orders", headers=make_auth_headers("someone-else"))

    assert len(own.json()) == 1
    assert len(other.json()) == 0
