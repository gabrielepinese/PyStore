import pytest


@pytest.fixture()
def auth_header(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "grace@example.com", "password": "supersecret123", "fullName": "Grace Hopper"},
    )
    token = r.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def test_update_profile(client, auth_header):
    r = client.patch(
        "/api/v1/auth/me",
        json={"fullName": "Grace M. Hopper", "phone": "+1 555 0100"},
        headers=auth_header,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["fullName"] == "Grace M. Hopper"
    assert body["phone"] == "+1 555 0100"

    r_me = client.get("/api/v1/auth/me", headers=auth_header)
    assert r_me.json()["fullName"] == "Grace M. Hopper"


def test_update_profile_requires_auth(client):
    r = client.patch("/api/v1/auth/me", json={"fullName": "Nope"})
    assert r.status_code == 401


def test_address_crud_and_default_promotion(client, auth_header):
    assert client.get("/api/v1/auth/me/addresses", headers=auth_header).json() == []

    home = client.post(
        "/api/v1/auth/me/addresses",
        json={
            "label": "Home",
            "fullName": "Grace Hopper",
            "line1": "1 Infinite Loop",
            "city": "Arlington",
            "postalCode": "22201",
            "country": "USA",
        },
        headers=auth_header,
    ).json()
    # First address becomes the default automatically.
    assert home["isDefault"] is True

    work = client.post(
        "/api/v1/auth/me/addresses",
        json={
            "label": "Work",
            "fullName": "Grace Hopper",
            "line1": "500 Office Way",
            "city": "Arlington",
            "postalCode": "22202",
            "country": "USA",
            "isDefault": True,
        },
        headers=auth_header,
    ).json()
    assert work["isDefault"] is True

    addresses = client.get("/api/v1/auth/me/addresses", headers=auth_header).json()
    assert len(addresses) == 2
    # Setting "Work" as default un-defaults "Home" — only one default at a time.
    home_now = next(a for a in addresses if a["id"] == home["id"])
    assert home_now["isDefault"] is False

    updated_home = client.put(
        f"/api/v1/auth/me/addresses/{home['id']}",
        json={
            "label": "Home",
            "fullName": "Grace Hopper",
            "line1": "1 Infinite Loop Updated",
            "city": "Arlington",
            "postalCode": "22201",
            "country": "USA",
        },
        headers=auth_header,
    )
    assert updated_home.status_code == 200
    assert updated_home.json()["line1"] == "1 Infinite Loop Updated"

    r_delete_work = client.delete(f"/api/v1/auth/me/addresses/{work['id']}", headers=auth_header)
    assert r_delete_work.status_code == 204

    # Deleting the default address promotes the remaining one.
    remaining = client.get("/api/v1/auth/me/addresses", headers=auth_header).json()
    assert len(remaining) == 1
    assert remaining[0]["isDefault"] is True

    r_missing = client.put(
        "/api/v1/auth/me/addresses/does-not-exist",
        json={
            "label": "X",
            "fullName": "Xx",
            "line1": "X",
            "city": "X",
            "postalCode": "X",
            "country": "X",
        },
        headers=auth_header,
    )
    assert r_missing.status_code == 404


def test_payment_method_never_exposes_full_card_number(client, auth_header):
    r = client.post(
        "/api/v1/auth/me/payment-methods",
        json={
            "cardNumber": "4242 4242 4242 4242",
            "cardholderName": "Grace Hopper",
            "expMonth": 12,
            "expYear": 2030,
        },
        headers=auth_header,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["last4"] == "4242"
    assert body["brand"] == "Visa"
    assert body["isDefault"] is True
    assert "cardNumber" not in body
    assert "4242424242424242" not in r.text

    second = client.post(
        "/api/v1/auth/me/payment-methods",
        json={
            "cardNumber": "5500005555555559",
            "cardholderName": "Grace Hopper",
            "expMonth": 6,
            "expYear": 2028,
        },
        headers=auth_header,
    ).json()
    assert second["brand"] == "Mastercard"
    assert second["isDefault"] is False

    r_default = client.put(
        f"/api/v1/auth/me/payment-methods/{second['id']}",
        json={"isDefault": True},
        headers=auth_header,
    )
    assert r_default.json()["isDefault"] is True

    cards = client.get("/api/v1/auth/me/payment-methods", headers=auth_header).json()
    first_card = next(c for c in cards if c["last4"] == "4242")
    assert first_card["isDefault"] is False

    r_bad_number = client.post(
        "/api/v1/auth/me/payment-methods",
        json={
            "cardNumber": "not-a-card",
            "cardholderName": "Grace Hopper",
            "expMonth": 1,
            "expYear": 2030,
        },
        headers=auth_header,
    )
    assert r_bad_number.status_code == 422

    r_delete = client.delete(f"/api/v1/auth/me/payment-methods/{second['id']}", headers=auth_header)
    assert r_delete.status_code == 204


def test_profile_endpoints_are_scoped_to_their_own_user(client):
    def register(email: str) -> dict:
        r = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "supersecret123", "fullName": "User"},
        )
        return {"Authorization": f"Bearer {r.json()['accessToken']}"}

    alice = register("alice@example.com")
    bob = register("bob@example.com")

    address = client.post(
        "/api/v1/auth/me/addresses",
        json={
            "label": "Home",
            "fullName": "Alice",
            "line1": "1 Alice St",
            "city": "Town",
            "postalCode": "00000",
            "country": "USA",
        },
        headers=alice,
    ).json()

    # Bob can't see or modify Alice's address.
    assert client.get("/api/v1/auth/me/addresses", headers=bob).json() == []
    assert client.delete(f"/api/v1/auth/me/addresses/{address['id']}", headers=bob).status_code == 404
