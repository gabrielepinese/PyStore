import os

# Must be set before `app.*` is imported anywhere, since config/settings are
# read at module-import time.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_products.db")

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
