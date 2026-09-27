def test_list_products_is_seeded(client):
    r = client.get("/api/v1/products")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 12
    assert len(body["items"]) == 12
    assert {"id", "name", "category", "price", "rating", "reviews", "accent"} <= body["items"][0].keys()


def test_filter_by_category(client):
    r = client.get("/api/v1/products", params={"category": "Electronics"})
    body = r.json()
    assert body["total"] == 3
    assert all(item["category"] == "Electronics" for item in body["items"])


def test_filter_by_all_category_returns_everything(client):
    r = client.get("/api/v1/products", params={"category": "All"})
    assert r.json()["total"] == 12


def test_search_is_case_insensitive_substring(client):
    r = client.get("/api/v1/products", params={"search": "LAMP"})
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Smart LED Desk Lamp"


def test_pagination_limit_and_offset(client):
    r = client.get("/api/v1/products", params={"limit": 5, "offset": 5})
    body = r.json()
    assert body["total"] == 12
    assert len(body["items"]) == 5
    assert body["limit"] == 5
    assert body["offset"] == 5


def test_list_categories(client):
    r = client.get("/api/v1/products/categories")
    assert r.status_code == 200
    assert set(r.json()) == {"Home", "Electronics", "Fashion", "Beauty", "Sports"}


def test_get_product_by_id(client):
    r = client.get("/api/v1/products/p1")
    assert r.status_code == 200
    assert r.json()["name"] == "Ceramic Pour-Over Set"


def test_get_product_not_found(client):
    r = client.get("/api/v1/products/does-not-exist")
    assert r.status_code == 404
