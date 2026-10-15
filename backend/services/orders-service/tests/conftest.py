import os

# Must be set before `app.*` is imported anywhere, since config/settings are
# read at module-import time.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_orders.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")

import jwt
import pytest
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


@pytest.fixture(autouse=True)
def _reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def make_auth_headers():
    def _make(user_id: str = "user-1") -> dict[str, str]:
        token = jwt.encode({"sub": user_id, "type": "access"}, "test-secret", algorithm="HS256")
        return {"Authorization": f"Bearer {token}"}

    return _make


@pytest.fixture()
def auth_headers(make_auth_headers):
    return make_auth_headers("user-1")
