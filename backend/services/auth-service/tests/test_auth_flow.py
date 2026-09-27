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
    assert "accessToken" in body
    assert "refreshToken" not in body
    assert r.cookies.get("refresh_token")

    # duplicate email is rejected
    r_dup = client.post("/api/v1/auth/register", json=register_payload)
    assert r_dup.status_code == 409

    # login with correct credentials — overwrites the client's refresh cookie
    r_login = client.post(
        "/api/v1/auth/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    assert r_login.status_code == 200
    tokens = r_login.json()
    assert "refreshToken" not in tokens
    login_refresh_cookie = r_login.cookies.get("refresh_token")
    assert login_refresh_cookie

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

    # refreshing rotates the refresh cookie (client jar carries it automatically)
    r_refresh = client.post("/api/v1/auth/refresh")
    assert r_refresh.status_code == 200
    assert "refreshToken" not in r_refresh.json()
    rotated_refresh_cookie = r_refresh.cookies.get("refresh_token")
    assert rotated_refresh_cookie
    assert rotated_refresh_cookie != login_refresh_cookie

    # replaying the rotated-out (old) cookie is reuse of a stolen token —
    # it's rejected AND kills the whole family, not just this one request
    r_reuse = client.post("/api/v1/auth/refresh", cookies={"refresh_token": login_refresh_cookie})
    assert r_reuse.status_code == 401

    # so the legitimately-latest cookie (from the same family) is now dead too
    r_refresh_after_reuse = client.post(
        "/api/v1/auth/refresh", cookies={"refresh_token": rotated_refresh_cookie}
    )
    assert r_refresh_after_reuse.status_code == 401

    # start a fresh session to exercise logout in isolation
    r_login2 = client.post(
        "/api/v1/auth/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    session_refresh_cookie = r_login2.cookies.get("refresh_token")

    r_logout = client.post("/api/v1/auth/logout")
    assert r_logout.status_code == 204

    r_refresh_after_logout = client.post(
        "/api/v1/auth/refresh", cookies={"refresh_token": session_refresh_cookie}
    )
    assert r_refresh_after_logout.status_code == 401
