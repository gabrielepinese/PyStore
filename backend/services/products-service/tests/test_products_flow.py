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


def test_filter_by_price_range(client):
    r = client.get("/api/v1/products", params={"minPrice": 40, "maxPrice": 65})
    body = r.json()
    assert body["total"] > 0
    assert all(40 <= item["price"] <= 65 for item in body["items"])


def test_min_price_above_max_price_is_rejected(client):
    r = client.get("/api/v1/products", params={"minPrice": 100, "maxPrice": 10})
    assert r.status_code == 422


def test_filter_by_min_rating(client):
    r = client.get("/api/v1/products", params={"minRating": 4.6})
    body = r.json()
    assert body["total"] > 0
    assert all(item["rating"] >= 4.6 for item in body["items"])


def test_filter_on_sale(client):
    r = client.get("/api/v1/products", params={"onSale": "true"})
    body = r.json()
    assert body["total"] == 3
    assert all(item["originalPrice"] > item["price"] for item in body["items"])


def test_filter_by_badge_case_insensitive(client):
    r = client.get("/api/v1/products", params={"badge": "new"})
    body = r.json()
    assert body["total"] == 2
    assert all(item["badge"] == "New" for item in body["items"])


def test_sort_price_ascending_and_descending(client):
    asc = [i["price"] for i in client.get("/api/v1/products", params={"sort": "price_asc"}).json()["items"]]
    desc = [i["price"] for i in client.get("/api/v1/products", params={"sort": "price_desc"}).json()["items"]]
    assert asc == sorted(asc)
    assert desc == sorted(desc, reverse=True)


def test_sort_by_discount_puts_biggest_discount_first(client):
    items = client.get("/api/v1/products", params={"sort": "discount"}).json()["items"]
    # p3: 129/159 → ~18.9% off; p7: 24/30 → 20% off; p1: 38/48 → ~20.8% off
    assert items[0]["id"] == "p1"
    assert items[-1]["originalPrice"] is None


def test_invalid_sort_is_rejected(client):
    assert client.get("/api/v1/products", params={"sort": "bogus"}).status_code == 422


def test_filters_combine_with_category_and_search(client):
    r = client.get("/api/v1/products", params={"category": "Electronics", "maxPrice": 100, "search": "desk"})
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == "p12"


def test_search_matches_category_name(client):
    r = client.get("/api/v1/products", params={"search": "beauty"})
    assert r.json()["total"] == 2


def test_category_summaries(client):
    r = client.get("/api/v1/products/categories/summary")
    assert r.status_code == 200
    body = r.json()
    assert sum(c["productCount"] for c in body) == 12
    counts = [c["productCount"] for c in body]
    assert counts == sorted(counts, reverse=True)

    electronics = next(c for c in body if c["name"] == "Electronics")
    assert electronics["productCount"] == 3
    assert electronics["minPrice"] == 46
    assert electronics["maxPrice"] == 129
    assert electronics["onSaleCount"] == 1
    assert electronics["featuredProduct"] == "Wireless Noise-Cancel Headphones"
    assert 1 <= len(electronics["accents"]) <= 3


def test_facets_for_category(client):
    r = client.get("/api/v1/products/facets", params={"category": "Electronics"})
    body = r.json()
    assert body["priceMin"] == 46
    assert body["priceMax"] == 129
    assert body["onSaleCount"] == 1
    assert {b["name"] for b in body["badges"]} == {"Sale", "New"}
