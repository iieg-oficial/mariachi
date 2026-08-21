"""Tests de los envios de grupo: identidad del envio, autorizacion y rol."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.users import _set_sieej_grupo
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.core.settings import get_settings
from app.main import app
from app.models.project import Project, UserProject
from app.models.sieej import (
    Formulario,
    Grupo,
    formulario_grupo,
    usuario_grupo,
)
from app.models.user import Usuario
from app.services.sieej.grupos_service import GruposService
from tests.conftest import PERMISOS_REPORTAR, TODOS_LOS_PERMISOS, login_as

settings = get_settings()
ADMIN_PREFIX = settings.admin_prefix
SIEEJ_TABLES = [t for t in Base.metadata.sorted_tables if t.schema == "sieej"]
PUBLIC_TABLES = [t for t in Base.metadata.sorted_tables if t.schema is None]


DEFINICION_DEMO = {
    "version": 1,
    "steps": [
        {
            "id": "general",
            "type": "form",
            "title": "Datos generales",
            "fields": [
                {
                    "name": "razon_social",
                    "label": "Razon social",
                    "type": "text",
                    "required": True,
                },
            ],
        }
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
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    s = session_factory()
    yield s
    s.close()


@pytest.fixture(scope="function")
def client(session):
    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def proyecto_sieej(session):
    p = Project(slug="sieej", name="SIEEJ", description="test", is_active=True)
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


@pytest.fixture(scope="function")
def admin(session):
    u = Usuario(
        username="admin_colab",
        email="admin-colab@test.com",
        name="Admin",
        hashed_password=hash_password("testpass123"),
        role="tetlamamakani",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


def crear_respondent(session, proyecto, username, nombre):
    u = Usuario(
        username=username,
        email=f"{username}@test.com",
        name=nombre,
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    session.add(
        UserProject(user_id=u.id, project_id=proyecto.id, project_role="editor")
    )
    session.commit()
    return u


@pytest.fixture(scope="function")
def ana(session, proyecto_sieej):
    return crear_respondent(session, proyecto_sieej, "ana", "Ana Lopez")


@pytest.fixture(scope="function")
def beto(session, proyecto_sieej):
    return crear_respondent(session, proyecto_sieej, "beto", "Beto Ruiz")


@pytest.fixture(scope="function")
def carla(session, proyecto_sieej):
    return crear_respondent(session, proyecto_sieej, "carla", "Carla Diaz")


def login(client, user, permisos=None):
    if permisos is None:
        permisos = (
            PERMISOS_REPORTAR if user.role == "externo" else TODOS_LOS_PERMISOS
        )
    return login_as(client, user, permisos)


def crear_formulario(session, admin, *, slug, colaborativo):
    f = Formulario(
        slug=slug,
        nombre=f"Form {slug}",
        descripcion="desc",
        definicion=DEFINICION_DEMO,
        estado="activo",
        publico=False,
        colaborativo=colaborativo,
        version=1,
        creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    return f


def crear_grupo(session, nombre, usuarios):
    g = Grupo(nombre=nombre)
    session.add(g)
    session.commit()
    session.refresh(g)
    for u in usuarios:
        session.execute(
            usuario_grupo.insert().values(usuario_id=u.id, grupo_id=g.id)
        )
    session.commit()
    return g


def asignar_grupo(session, formulario, grupo):
    session.execute(
        formulario_grupo.insert().values(
            formulario_id=formulario.id, grupo_id=grupo.id
        )
    )
    session.commit()


def test_dos_miembros_del_grupo_comparten_el_envio(session, client, admin, ana, beto):
    f = crear_formulario(session, admin, slug="colab-1", colaborativo=True)
    asignar_grupo(session, f, crear_grupo(session, "dependencia-1", [ana, beto]))

    login(client, ana)
    envio_ana = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    login(client, beto)
    envio_beto = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()

    assert envio_ana["id"] == envio_beto["id"]


def test_formulario_individual_da_un_envio_por_persona(
    session, client, admin, ana, beto
):
    f = crear_formulario(session, admin, slug="indiv-1", colaborativo=False)
    asignar_grupo(session, f, crear_grupo(session, "dependencia-2", [ana, beto]))

    login(client, ana)
    envio_ana = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    login(client, beto)
    envio_beto = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()

    assert envio_ana["id"] != envio_beto["id"]


def test_ajeno_al_grupo_no_puede_ver_el_envio(
    session, client, admin, ana, beto, carla
):
    f = crear_formulario(session, admin, slug="colab-2", colaborativo=True)
    asignar_grupo(session, f, crear_grupo(session, "dependencia-3", [ana, beto]))

    login(client, ana)
    envio_id = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()["id"]

    login(client, beto)
    assert client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/{envio_id}").status_code == 200

    login(client, carla)
    r = client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/{envio_id}")
    assert r.status_code == 403


def test_salir_del_grupo_quita_el_acceso_al_envio(session, client, admin, ana, beto):
    f = crear_formulario(session, admin, slug="colab-3", colaborativo=True)
    grupo = crear_grupo(session, "dependencia-4", [ana, beto])
    asignar_grupo(session, f, grupo)

    login(client, ana)
    envio_id = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()["id"]

    session.execute(
        usuario_grupo.delete().where(
            usuario_grupo.c.usuario_id == ana.id,
            usuario_grupo.c.grupo_id == grupo.id,
        )
    )
    session.commit()

    r = client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/{envio_id}")
    assert r.status_code == 403


def test_pertenecer_a_dos_grupos_del_formulario_devuelve_409(
    session, client, admin, ana, beto
):
    f = crear_formulario(session, admin, slug="colab-4", colaborativo=True)
    uno = crear_grupo(session, "aaa-primero", [ana, beto])
    dos = crear_grupo(session, "bbb-segundo", [ana])
    asignar_grupo(session, f, uno)
    asignar_grupo(session, f, dos)

    login(client, ana)
    r = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio")
    assert r.status_code == 409
    detail = r.json()["detail"]
    assert detail["codigo"] == "grupo_ambiguo"
    assert {g["id"] for g in detail["grupos"]} == {uno.id, dos.id}

    r = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio?grupo_id={dos.id}")
    assert r.status_code == 200


def test_grupo_id_de_un_grupo_ajeno_es_403(session, client, admin, ana, beto):
    f = crear_formulario(session, admin, slug="colab-5", colaborativo=True)
    mio = crear_grupo(session, "aaa-mio", [ana, beto])
    ajeno = crear_grupo(session, "bbb-ajeno", [beto])
    asignar_grupo(session, f, mio)
    asignar_grupo(session, f, ajeno)

    login(client, ana)
    r = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio?grupo_id={ajeno.id}")
    assert r.status_code == 403


def test_el_listado_muestra_el_envio_que_empezo_el_companero(
    session, client, admin, ana, beto
):
    f = crear_formulario(session, admin, slug="colab-6", colaborativo=True)
    asignar_grupo(session, f, crear_grupo(session, "dependencia-5", [ana, beto]))

    login(client, ana)
    envio_id = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()["id"]

    login(client, beto)
    items = client.get(f"{ADMIN_PREFIX}/formularios").json()
    item = next(i for i in items if i["slug"] == f.slug)
    assert item["envio_id"] == envio_id
    assert item["estado_envio"] == "en_proceso"


def test_actualizar_miembros_conserva_el_rol_de_los_que_siguen(
    session, ana, beto, carla
):
    grupo = crear_grupo(session, "dependencia-6", [ana, beto])
    session.execute(
        usuario_grupo.update()
        .where(
            usuario_grupo.c.grupo_id == grupo.id,
            usuario_grupo.c.usuario_id == ana.id,
        )
        .values(rol="coordinador")
    )
    session.commit()

    GruposService(session).actualizar_miembros(grupo.id, [ana.id, carla.id])

    roles = {
        fila.usuario_id: fila.rol
        for fila in session.query(usuario_grupo)
        .filter(usuario_grupo.c.grupo_id == grupo.id)
        .all()
    }
    assert roles == {ana.id: "coordinador", carla.id: "capturista"}


def test_reasignar_al_mismo_grupo_conserva_el_rol(session, ana):
    grupo = crear_grupo(session, "dependencia-7", [ana])
    session.execute(
        usuario_grupo.update()
        .where(
            usuario_grupo.c.grupo_id == grupo.id,
            usuario_grupo.c.usuario_id == ana.id,
        )
        .values(rol="coordinador")
    )
    session.commit()

    _set_sieej_grupo(session, ana, grupo.id, None)
    session.commit()

    fila = (
        session.query(usuario_grupo)
        .filter(usuario_grupo.c.usuario_id == ana.id)
        .one()
    )
    assert fila.grupo_id == grupo.id
    assert fila.rol == "coordinador"


def test_mover_de_grupo_deja_una_sola_membresia(session, ana):
    viejo = crear_grupo(session, "dependencia-8", [ana])
    nuevo = crear_grupo(session, "dependencia-9", [])

    _set_sieej_grupo(session, ana, nuevo.id, None)
    session.commit()

    filas = (
        session.query(usuario_grupo)
        .filter(usuario_grupo.c.usuario_id == ana.id)
        .all()
    )
    assert [f.grupo_id for f in filas] == [nuevo.id]
    assert viejo.id not in [f.grupo_id for f in filas]
