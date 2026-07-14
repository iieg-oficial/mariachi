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
    CatalogoEjesEstrategicos,
    EnvioFormulario,
    Formulario,
)
from app.models.user import Usuario

settings = get_settings()
ADMIN_PREFIX = settings.admin_prefix
SIEEJ_TABLES = [t for t in Base.metadata.sorted_tables if t.schema == "sieej"]
PUBLIC_TABLES = [t for t in Base.metadata.sorted_tables if t.schema is None]

DEFINICION = {
    "version": 1,
    "steps": [
        {
            "id": "general",
            "type": "form",
            "title": "General",
            "fields": [
                {
                    "name": "ejes",
                    "label": "Ejes",
                    "type": "select_multiple",
                    "catalog": "ejes_estrategicos",
                }
            ],
        },
        {
            "id": "bases",
            "type": "repeater",
            "title": "Bases",
            "fields": [
                {
                    "name": "eje_base",
                    "label": "Eje",
                    "type": "select",
                    "catalog": "ejes_estrategicos",
                }
            ],
        },
    ],
}


@pytest.fixture(scope="function")
def engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with eng.connect() as conn:
        conn.execute(text("ATTACH DATABASE ':memory:' AS sieej"))
        conn.commit()
    Base.metadata.create_all(bind=eng, tables=PUBLIC_TABLES + SIEEJ_TABLES)
    yield eng
    Base.metadata.drop_all(bind=eng, tables=SIEEJ_TABLES + PUBLIC_TABLES)


@pytest.fixture(scope="function")
def session(engine):
    factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    s = factory()
    yield s
    s.close()


@pytest.fixture(scope="function")
def client(session):
    def override():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def admin(session):
    u = Usuario(
        username="admin_c",
        email="admin_c@t.com",
        name="Admin",
        hashed_password=hash_password("testpass123"),
        role="tetlamamakani",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


@pytest.fixture(scope="function")
def respondent(session):
    p = Project(slug="sieej", name="SIEEJ", description="t", is_active=True)
    session.add(p)
    session.commit()
    session.refresh(p)

    u = Usuario(
        username="resp_c",
        email="resp_c@t.com",
        name="R",
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    session.add(UserProject(user_id=u.id, project_id=p.id, project_role="editor"))
    session.commit()
    return u


def login(client, username, password="testpass123"):
    r = client.post(
        f"{ADMIN_PREFIX}/autenticacion/iniciar-sesion",
        json={"username": username, "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()["csrf_token"]


def _seed_eje(session, value: str) -> CatalogoEjesEstrategicos:
    item = CatalogoEjesEstrategicos(value=value)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def _seed_envio(session, admin, respondent, datos: dict) -> EnvioFormulario:
    f = Formulario(
        slug="cat",
        nombre="Cat",
        definicion=DEFINICION,
        estado="activo",
        version=1,
        creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    envio = EnvioFormulario(
        formulario_id=f.id,
        formulario_version=1,
        usuario_id=respondent.id,
        definicion_snapshot=DEFINICION,
        estado="en_proceso",
        datos=datos,
    )
    session.add(envio)
    session.commit()
    session.refresh(envio)
    return envio


def test_listar_catalogos_devuelve_los_ocho(client, admin):
    login(client, admin.username)
    r = client.get(f"{ADMIN_PREFIX}/sieej/catalogos")
    assert r.status_code == 200, r.text
    claves = {c["clave"] for c in r.json()}
    assert "ejes_estrategicos" in claves
    assert len(claves) == 8


def test_listar_catalogos_incluye_campos_enlazados(
    client, admin, respondent, session
):
    _seed_envio(session, admin, respondent, {})
    login(client, admin.username)
    r = client.get(f"{ADMIN_PREFIX}/sieej/catalogos")
    assert r.status_code == 200, r.text

    por_clave = {c["clave"]: c for c in r.json()}
    campos = por_clave["ejes_estrategicos"]["campos"]
    assert {c["field_name"] for c in campos} == {"ejes", "eje_base"}
    assert all(c["formulario"] == "Cat" for c in campos)

    assert por_clave["periodicidad"]["campos"] == []


def test_catalogo_desconocido_da_404(client, admin):
    login(client, admin.username)
    r = client.get(f"{ADMIN_PREFIX}/sieej/catalogos/no_existe")
    assert r.status_code == 404


def test_crear_opcion(client, admin):
    csrf = login(client, admin.username)
    r = client.post(
        f"{ADMIN_PREFIX}/sieej/catalogos/ejes_estrategicos",
        headers={"X-CSRF-Token": csrf},
        json={"value": "Otro"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["value"] == "Otro"
    assert r.json()["en_uso"] == 0


def test_crear_opcion_duplicada_da_409(client, admin, session):
    _seed_eje(session, "Salud")
    csrf = login(client, admin.username)
    r = client.post(
        f"{ADMIN_PREFIX}/sieej/catalogos/ejes_estrategicos",
        headers={"X-CSRF-Token": csrf},
        json={"value": "Salud"},
    )
    assert r.status_code == 409


def test_en_uso_cuenta_envios_en_form_y_repeater(
    client, admin, respondent, session
):
    _seed_eje(session, "Salud")
    _seed_eje(session, "Seguridad")
    _seed_envio(
        session,
        admin,
        respondent,
        {
            "general": {"ejes": ["Salud"]},
            "bases": [{"eje_base": "Seguridad"}],
        },
    )
    login(client, admin.username)
    r = client.get(f"{ADMIN_PREFIX}/sieej/catalogos/ejes_estrategicos")
    assert r.status_code == 200, r.text
    por_valor = {i["value"]: i["en_uso"] for i in r.json()}
    assert por_valor["Salud"] == 1
    assert por_valor["Seguridad"] == 1


def test_borrar_opcion_en_uso_da_409(client, admin, respondent, session):
    item = _seed_eje(session, "Salud")
    _seed_envio(session, admin, respondent, {"general": {"ejes": ["Salud"]}})
    csrf = login(client, admin.username)
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/catalogos/ejes_estrategicos/{item.id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 409
    assert "1 envio" in r.json()["detail"]


def test_borrar_opcion_sin_uso_funciona(client, admin, session):
    item = _seed_eje(session, "Sin uso")
    csrf = login(client, admin.username)
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/catalogos/ejes_estrategicos/{item.id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 204
    assert session.query(CatalogoEjesEstrategicos).count() == 0


def test_renombrar_propaga_a_envios(client, admin, respondent, session):
    item = _seed_eje(session, "Salud")
    envio = _seed_envio(
        session,
        admin,
        respondent,
        {
            "general": {"ejes": ["Salud", "Otro"]},
            "bases": [{"eje_base": "Salud"}],
        },
    )
    csrf = login(client, admin.username)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/catalogos/ejes_estrategicos/{item.id}",
        headers={"X-CSRF-Token": csrf},
        json={"value": "Salud publica"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["value"] == "Salud publica"

    session.expire_all()
    actualizado = session.query(EnvioFormulario).filter_by(id=envio.id).first()
    assert actualizado.datos["general"]["ejes"] == ["Salud publica", "Otro"]
    assert actualizado.datos["bases"][0]["eje_base"] == "Salud publica"


def test_renombrar_a_valor_existente_da_409(client, admin, session):
    item = _seed_eje(session, "Salud")
    _seed_eje(session, "Seguridad")
    csrf = login(client, admin.username)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/catalogos/ejes_estrategicos/{item.id}",
        headers={"X-CSRF-Token": csrf},
        json={"value": "Seguridad"},
    )
    assert r.status_code == 409
