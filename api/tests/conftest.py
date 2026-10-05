from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.core.database import Base, get_dataengine_db, get_db
from app.core.security import crear_csrf_token, hash_password
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

_TEST_SCHEMAS = (None, "acervo", "huachicol", "mel", "sieej", "sieej_documentacion")

with engine.connect() as _conn:
    for _schema in _TEST_SCHEMAS:
        if _schema is not None:
            _conn.execute(text(f"ATTACH DATABASE ':memory:' AS {_schema}"))
    _conn.commit()

_ESQUEMA = {"listo": False}
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    tables = [t for t in Base.metadata.sorted_tables if t.schema in _TEST_SCHEMAS]
    if not _ESQUEMA["listo"]:
        Base.metadata.create_all(bind=engine, tables=tables)
        _ESQUEMA["listo"] = True
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        with engine.begin() as conn:
            for table in reversed(tables):
                conn.execute(table.delete())


@pytest.fixture(autouse=True)
def _descubrimiento_oidc_sin_red():
    from app.core import oidc

    target = oidc.settings.minerva_issuer_url.rstrip("/")
    anterior = dict(oidc._discovery_cache)
    oidc._discovery_cache["doc"] = {
        "authorization_endpoint": f"{target}/auth/authorize",
        "token_endpoint": f"{target}/auth/token",
        "revocation_endpoint": f"{target}/auth/revoke",
    }
    oidc._discovery_cache["exp"] = float("inf")
    yield
    oidc._discovery_cache.update(anterior)


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


@pytest.fixture(scope="function")
def externo_user(db_session):
    user = Usuario(
        username="externo_test",
        email="externo@test.com",
        name="Externo Test",
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


TODOS_LOS_PERMISOS = frozenset({
    "mariachi.sieej_documentacion.view",
    "mariachi.sieej_documentacion.update",
    "mariachi.sieej_documentacion.publish",
    "mariachi.roadmap.manage",
    "mariachi.mapalab.view",
    "mariachi.mapalab.update",
    "mariachi.mapalab.manage",
    "mariachi.mapalab_llaves.manage",
    "mariachi.mapalab_acceso.manage",
    "mariachi.mapalab_propuestas.approve",
    "mariachi.portal.view",
    "mariachi.portal.update",
    "mariachi.sieej_admin.view",
    "mariachi.sieej_formularios.view",
    "mariachi.sieej_formularios.create",
    "mariachi.sieej_formularios.update",
    "mariachi.sieej_formularios.delete",
    "mariachi.sieej_envios.view",
    "mariachi.sieej_envios.create",
    "mariachi.sieej_envios.update",
    "mariachi.sieej_envios.delete",
    "mariachi.sieej_envios.export",
    "mariachi.acervo.view",
    "mariachi.acervo.create",
    "mariachi.acervo.update",
    "mariachi.acervo.delete",
    "mariachi.acervo.manage",
    "mariachi.colibri_reportes.view",
    "mariachi.colibri_reportes.update",
    "mariachi.colibri_config.manage",
    "mariachi.mel.view",
    "mariachi.mel.update",
    "mariachi.geoserver.view",
    "mariachi.geoserver.manage",
    "mariachi.actividad.view",
    "mariachi.usuarios.view",
    "mariachi.usuarios.create",
    "mariachi.usuarios.update",
    "mariachi.usuarios.delete",
    "mariachi.usuarios.assign",
    "mariachi.sistema.manage",
})

PERMISOS_REPORTAR = frozenset({
    "mariachi.sieej_formularios.view",
    "mariachi.sieej_envios.view",
    "mariachi.sieej_envios.create",
    "mariachi.sieej_envios.update",
    "mariachi.sieej_envios.delete",
})

PERMISOS_EDITORA = frozenset({
    "mariachi.mapalab.view",
    "mariachi.mapalab.update",
    "mariachi.mapalab.manage",
    "mariachi.sieej_admin.view",
    "mariachi.portal.view",
    "mariachi.portal.update",
    "mariachi.sieej_formularios.view",
    "mariachi.sieej_envios.view",
    "mariachi.acervo.view",
    "mariachi.acervo.create",
    "mariachi.acervo.update",
    "mariachi.colibri_reportes.view",
    "mariachi.geoserver.view",
    "mariachi.usuarios.view",
})


def establecer_cookies_de_sesion(client, user):
    from app.api.deps import issue_access_token
    from app.core import minerva_session, refresh_token

    client.cookies.clear()
    sid = minerva_session.new_sid()
    client.cookies.set(settings.cookie_name, issue_access_token(user.username, sid))
    raw = refresh_token.issue(user.username, sid)
    if raw:
        client.cookies.set(settings.refresh_cookie_name, raw)
    return sid


def login_as(client, user, permissions):
    user.permissions = set(permissions)

    async def override_get_current_user():
        return user

    app.dependency_overrides[get_current_user] = override_get_current_user
    return crear_csrf_token(user.username)


@pytest.fixture(scope="function")
def admin_session(client, admin_user):
    csrf = login_as(client, admin_user, TODOS_LOS_PERMISOS)
    return {"client": client, "csrf": csrf, "user": admin_user}


@pytest.fixture(scope="function")
def editora_session(client, editora_user):
    csrf = login_as(client, editora_user, PERMISOS_EDITORA)
    return {"client": client, "csrf": csrf, "user": editora_user}


@pytest.fixture(scope="function")
def externo_session(client, externo_user):
    csrf = login_as(client, externo_user, PERMISOS_REPORTAR)
    return {"client": client, "csrf": csrf, "user": externo_user}
