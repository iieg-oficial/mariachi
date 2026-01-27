import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.user import Usuario

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


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


@pytest.fixture(scope="function")
def admin_token(client, admin_user):
    response = client.post(
        "/api/administrador/auth/login",
        json={"username": "admin_test", "password": "testpass123"},
    )
    return response.json()["access_token"]


@pytest.fixture(scope="function")
def editora_token(client, editora_user):
    response = client.post(
        "/api/administrador/auth/login",
        json={"username": "editora_test", "password": "testpass123"},
    )
    return response.json()["access_token"]
