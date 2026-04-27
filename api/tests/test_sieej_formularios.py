import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.core.settings import get_settings
from app.main import app
from app.models.project import Project, UserProject
from app.models.sieej import (
    BasesDatos,
    CatalogoUnidadAdmin,
)
from app.models.user import Usuario

settings = get_settings()
ADMIN_PREFIX = settings.admin_prefix
SIEEJ_TABLES = [t for t in Base.metadata.sorted_tables if t.schema == "sieej"]
PUBLIC_TABLES = [t for t in Base.metadata.sorted_tables if t.schema is None]


@pytest.fixture(scope="function")
def sieej_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.connect() as conn:
        conn.execute(text("ATTACH DATABASE ':memory:' AS sieej"))
        conn.commit()
    Base.metadata.create_all(bind=engine, tables=PUBLIC_TABLES + SIEEJ_TABLES)
    yield engine
    Base.metadata.drop_all(bind=engine, tables=SIEEJ_TABLES + PUBLIC_TABLES)


@pytest.fixture(scope="function")
def sieej_session(sieej_engine):
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=sieej_engine)
    session = session_factory()
    yield session
    session.close()


@pytest.fixture(scope="function")
def sieej_client(sieej_session):
    def override_get_db():
        try:
            yield sieej_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def sieej_project(sieej_session):
    p = Project(slug="sieej", name="SIEEJ", description="test", is_active=True)
    sieej_session.add(p)
    sieej_session.commit()
    sieej_session.refresh(p)
    return p


@pytest.fixture(scope="function")
def admin_global(sieej_session):
    u = Usuario(
        username="admin_test",
        email="admin@test.com",
        name="Admin",
        hashed_password=hash_password("testpass123"),
        role="tetlamamakani",
    )
    sieej_session.add(u)
    sieej_session.commit()
    sieej_session.refresh(u)
    return u


@pytest.fixture(scope="function")
def externo_sin_acceso(sieej_session):
    u = Usuario(
        username="ext_sin",
        email="ext_sin@test.com",
        name="Externo Sin Acceso",
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    sieej_session.add(u)
    sieej_session.commit()
    sieej_session.refresh(u)
    return u


@pytest.fixture(scope="function")
def externo_dependencia(sieej_session, sieej_project):
    u = Usuario(
        username="dep_test",
        email="dep@test.com",
        name="Dependencia",
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    sieej_session.add(u)
    sieej_session.commit()
    sieej_session.refresh(u)

    sieej_session.add(UserProject(user_id=u.id, project_id=sieej_project.id, project_role="editor"))
    sieej_session.commit()
    return u


def login(client, username, password="testpass123"):
    r = client.post(
        f"{ADMIN_PREFIX}/autenticacion/iniciar-sesion",
        json={"username": username, "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()["csrf_token"]


def test_externo_sin_userproject_recibe_403_en_catalogos(sieej_client, externo_sin_acceso, sieej_project):
    login(sieej_client, externo_sin_acceso.username)
    r = sieej_client.get(f"{ADMIN_PREFIX}/formularios/catalogos")
    assert r.status_code == 403, r.text


def test_externo_dependencia_ve_catalogos(sieej_client, externo_dependencia):
    login(sieej_client, externo_dependencia.username)
    r = sieej_client.get(f"{ADMIN_PREFIX}/formularios/catalogos")
    assert r.status_code == 200
    body = r.json()
    assert "unidades_admin" in body
    assert isinstance(body["unidades_admin"], list)


def test_admin_global_bypass_aunque_no_tenga_userproject(sieej_client, admin_global, sieej_project):
    login(sieej_client, admin_global.username)
    r = sieej_client.get(f"{ADMIN_PREFIX}/formularios/catalogos")
    assert r.status_code == 200


def test_externo_recibe_404_en_general_si_no_existe(sieej_client, externo_dependencia):
    csrf = login(sieej_client, externo_dependencia.username)
    r = sieej_client.get(f"{ADMIN_PREFIX}/formularios/general", headers={"X-CSRF-Token": csrf})
    assert r.status_code == 404


def test_externo_crea_general_y_la_recupera(sieej_client, sieej_session, externo_dependencia):
    sieej_session.add(CatalogoUnidadAdmin(value="Secretaria de Movilidad"))
    sieej_session.commit()

    csrf = login(sieej_client, externo_dependencia.username)
    r = sieej_client.post(
        f"{ADMIN_PREFIX}/formularios/general",
        headers={"X-CSRF-Token": csrf},
        json={
            "nombre_ente_gobierno": "Secretaria X",
            "unidad_admin": "Secretaria de Movilidad",
            "hay_responsable": True,
            "descripcion_hay_responsable": "Direccion de Datos",
            "desafios_oportunidades": "Mejorar pipelines",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["nombre_ente_gobierno"] == "Secretaria X"
    assert body["unidad_admin"] == "Secretaria de Movilidad"
    assert body["hay_responsable"] is True

    r2 = sieej_client.get(f"{ADMIN_PREFIX}/formularios/general")
    assert r2.status_code == 200
    assert r2.json()["nombre_ente_gobierno"] == "Secretaria X"


def test_externo_lista_enlaces_vacio(sieej_client, externo_dependencia):
    login(sieej_client, externo_dependencia.username)
    r = sieej_client.get(f"{ADMIN_PREFIX}/formularios/enlaces")
    assert r.status_code == 200
    assert r.json() == []


def test_externo_crea_y_lista_base_datos(sieej_client, externo_dependencia):
    csrf = login(sieej_client, externo_dependencia.username)
    r = sieej_client.post(
        f"{ADMIN_PREFIX}/formularios/bases-datos",
        headers={"X-CSRF-Token": csrf},
        json={"nombre_bd": "BD Test", "descripcion_bd": "Descripcion"},
    )
    assert r.status_code == 201, r.text
    bd_id = r.json()["id"]

    r2 = sieej_client.get(f"{ADMIN_PREFIX}/formularios/bases-datos")
    assert r2.status_code == 200
    items = r2.json()
    assert len(items) == 1
    assert items[0]["id"] == bd_id


def test_externo_no_ve_bases_datos_de_otro_usuario(sieej_client, sieej_session, externo_dependencia, sieej_project):
    otro = Usuario(
        username="dep_otra",
        email="otra@test.com",
        name="Otra Dependencia",
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    sieej_session.add(otro)
    sieej_session.commit()
    sieej_session.refresh(otro)
    sieej_session.add(UserProject(user_id=otro.id, project_id=sieej_project.id, project_role="editor"))
    sieej_session.add(BasesDatos(user_id=otro.id, nombre_bd="BD Ajena", descripcion_bd="No mia"))
    sieej_session.commit()

    login(sieej_client, externo_dependencia.username)
    r = sieej_client.get(f"{ADMIN_PREFIX}/formularios/bases-datos")
    assert r.status_code == 200
    assert r.json() == []
