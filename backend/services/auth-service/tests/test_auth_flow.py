def test_register_login_me_refresh_logout_flow(client):
    register_payload = {
        "email": "ada@example.com",
        "password": "supersecret123",
        "fullName": "Ada Lovelace",
    }

    r = client.post("/api/v1/auth/register", json=register_payload)
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["email"] == register_payload["email"]
    assert "accessToken" in body and "refreshToken" in body

    # duplicate email is rejected
    r_dup = client.post("/api/v1/auth/register", json=register_payload)
    assert r_dup.status_code == 409

    # login with correct credentials
    r_login = client.post(
        "/api/v1/auth/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    assert r_login.status_code == 200
    tokens = r_login.json()

    # login with wrong password is rejected
    r_bad = client.post(
        "/api/v1/auth/login", json={"email": register_payload["email"], "password": "wrong-pass"}
    )
    assert r_bad.status_code == 401

    # /me requires a valid access token
    r_me_noauth = client.get("/api/v1/auth/me")
    assert r_me_noauth.status_code == 401

    r_me = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['accessToken']}"}
    )
    assert r_me.status_code == 200
    assert r_me.json()["fullName"] == register_payload["fullName"]

    # refreshing rotates the refresh token
    r_refresh = client.post("/api/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]})
    assert r_refresh.status_code == 200
    new_tokens = r_refresh.json()
    assert new_tokens["refreshToken"] != tokens["refreshToken"]

    # the rotated-out (old) refresh token can no longer be used
    r_refresh_reuse = client.post(
        "/api/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]}
    )
    assert r_refresh_reuse.status_code == 401

    # logout revokes the current refresh token
    r_logout = client.post("/api/v1/auth/logout", json={"refreshToken": new_tokens["refreshToken"]})
    assert r_logout.status_code == 204

    r_refresh_after_logout = client.post(
        "/api/v1/auth/refresh", json={"refreshToken": new_tokens["refreshToken"]}
    )
    assert r_refresh_after_logout.status_code == 401
