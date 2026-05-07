import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.core.settings import get_settings
from app.main import app
from app.models.user import Usuario


def _table_pg_only(table) -> bool:
    return any(isinstance(col.type, (JSONB, ARRAY)) for col in table.columns)

settings = get_settings()
ADMIN_PREFIX = settings.admin_prefix

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    tables = [
        t for t in Base.metadata.sorted_tables
        if t.schema is None and not _table_pg_only(t)
    ]
    Base.metadata.create_all(bind=engine, tables=tables)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine, tables=tables)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def admin_user(db_session):
    user = Usuario(
        username="admin_test",
        email="admin@test.com",
        name="Admin Test",
        hashed_password=hash_password("testpass123"),
        role="tetlamamakani",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def editora_user(db_session):
    user = Usuario(
        username="editora_test",
        email="editora@test.com",
        name="Editora Test",
        hashed_password=hash_password("testpass123"),
        role="editora",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def login_as(client, username, password):
    response = client.post(
        f"{ADMIN_PREFIX}/autenticacion/iniciar-sesion",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["csrf_token"]


@pytest.fixture(scope="function")
def admin_session(client, admin_user):
    csrf = login_as(client, "admin_test", "testpass123")
    return {"client": client, "csrf": csrf, "user": admin_user}


@pytest.fixture(scope="function")
def editora_session(client, editora_user):
    csrf = login_as(client, "editora_test", "testpass123")
    return {"client": client, "csrf": csrf, "user": editora_user}
