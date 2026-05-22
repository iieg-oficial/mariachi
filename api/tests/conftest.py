from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_dataengine_db, get_db
from app.core.security import hash_password
from app.core.settings import get_settings
from app.main import app
from app.models.user import Usuario


# Shim de tipos Postgres → SQLite: hace que `JSONB` y `ARRAY` se compilen como
# `JSON` y `BLOB` en SQLite, permitiendo `create_all()` sobre tablas con esas
# columnas (sin estos shims, SQLiteTypeCompiler revienta con "no such attribute
# visit_JSONB"). Los modelos no se tocan; solo afecta al entorno de tests.
def _visit_jsonb(self, type_, **kw):
    return "JSON"

def _visit_array(self, type_, **kw):
    return "BLOB"

SQLiteTypeCompiler.visit_JSONB = _visit_jsonb
SQLiteTypeCompiler.visit_ARRAY = _visit_array


# En SQLite, `INTEGER PRIMARY KEY` es alias de ROWID y auto-incrementa; pero
# `BIGINT PRIMARY KEY` no, lo que rompe INSERTs sin id explicito. Como en tests
# no nos importa el rango, mapeamos BIGINT a INTEGER en la compilacion DDL.
def _visit_big_integer(self, type_, **kw):
    return "INTEGER"

SQLiteTypeCompiler.visit_BIGINT = _visit_big_integer
SQLiteTypeCompiler.visit_big_integer = _visit_big_integer


def _sqlite_safe_server_default(raw: str) -> str | None:
    """Traduce server_defaults Postgres-only a algo que SQLite acepte.

    Convertimos los casts `'X'::jsonb` a literales JSON, `NOW()`/`now()` a
    `CURRENT_TIMESTAMP`. Si no se puede traducir, devolvemos None para que el
    server_default se ignore en el CREATE TABLE de tests.
    """
    import re
    cleaned = raw.strip()
    cleaned = re.sub(r"::\s*jsonb\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bNOW\(\)", "CURRENT_TIMESTAMP", cleaned, flags=re.IGNORECASE)
    return cleaned


def _apply_sqlite_metadata_shims():
    """Mutacion one-shot de los modelos globales para que SQLite acepte sus DDL.

    Se ejecuta al cargar conftest (antes de cualquier fixture) para que tambien
    cubra tests que crean su propio `engine()` con `Base.metadata.create_all`.
    """
    from sqlalchemy import text
    from sqlalchemy.schema import DefaultClause
    for table in Base.metadata.tables.values():
        for col in table.columns:
            if col.server_default is None:
                continue
            arg = getattr(col.server_default, "arg", None)
            raw = str(arg) if arg is not None else None
            if not raw:
                continue
            cleaned = _sqlite_safe_server_default(raw)
            if cleaned != raw:
                col.server_default = DefaultClause(text(cleaned))


_apply_sqlite_metadata_shims()


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
    tables = [t for t in Base.metadata.sorted_tables if t.schema is None]
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

    def override_get_dataengine_db():
        yield MagicMock()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_dataengine_db] = override_get_dataengine_db
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
