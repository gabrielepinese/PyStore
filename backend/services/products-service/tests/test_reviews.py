def test_list_reviews_default_page_size(client):
    r = client.get("/api/v1/products/p1/reviews")
    assert r.status_code == 200
    body = r.json()
    assert body["limit"] == 5
    assert body["offset"] == 0
    assert len(body["items"]) == min(5, body["total"])
    assert body["total"] > 0


def test_reviews_overview_matches_product_aggregate(client):
    product = client.get("/api/v1/products/p1").json()
    r = client.get("/api/v1/products/p1/reviews")
    body = r.json()
    assert body["averageRating"] == product["rating"]
    assert body["reviewCount"] == product["reviews"]
    # The breakdown models the full aggregate review_count, not just the
    # sample of real review rows returned in `items`/`total`.
    assert sum(body["ratingBreakdown"].values()) == body["reviewCount"]


def test_reviews_pagination_advances_by_limit(client):
    first = client.get("/api/v1/products/p1/reviews", params={"limit": 5, "offset": 0}).json()
    second = client.get("/api/v1/products/p1/reviews", params={"limit": 5, "offset": 5}).json()
    first_ids = {item["id"] for item in first["items"]}
    second_ids = {item["id"] for item in second["items"]}
    assert first_ids.isdisjoint(second_ids)


def test_reviews_item_shape(client):
    body = client.get("/api/v1/products/p1/reviews").json()
    item = body["items"][0]
    assert {"id", "productId", "author", "rating", "title", "body", "createdAt"} <= item.keys()
    assert 1 <= item["rating"] <= 5


def test_reviews_for_missing_product_is_404(client):
    r = client.get("/api/v1/products/does-not-exist/reviews")
    assert r.status_code == 404


def test_reviews_limit_is_bounded(client):
    assert client.get("/api/v1/products/p1/reviews", params={"limit": 0}).status_code == 422
    assert client.get("/api/v1/products/p1/reviews", params={"limit": 51}).status_code == 422
