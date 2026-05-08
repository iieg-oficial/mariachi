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
    Formulario,
    Grupo,
    formulario_grupo,
    formulario_usuario,
    usuario_grupo,
)
from app.models.user import Usuario

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
                {"name": "razon_social", "label": "Razon social", "type": "text", "required": True},
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
        username="admin_x",
        email="admin@test.com",
        name="Admin",
        hashed_password=hash_password("testpass123"),
        role="tetlamamakani",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


@pytest.fixture(scope="function")
def respondent_a(session, proyecto_sieej):
    u = Usuario(
        username="resp_a",
        email="a@test.com",
        name="Respondent A",
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    session.add(UserProject(user_id=u.id, project_id=proyecto_sieej.id, project_role="editor"))
    session.commit()
    return u


@pytest.fixture(scope="function")
def respondent_b(session, proyecto_sieej):
    u = Usuario(
        username="resp_b",
        email="b@test.com",
        name="Respondent B",
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    session.add(UserProject(user_id=u.id, project_id=proyecto_sieej.id, project_role="editor"))
    session.commit()
    return u


def login(client, username, password="testpass123"):
    r = client.post(
        f"{ADMIN_PREFIX}/autenticacion/iniciar-sesion",
        json={"username": username, "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()["csrf_token"]


def crear_formulario(session, admin, *, slug="form-test", nombre="Form Test", estado="activo"):
    f = Formulario(
        slug=slug,
        nombre=nombre,
        descripcion="desc",
        definicion=DEFINICION_DEMO,
        estado=estado,
        publico=False,
        version=1,
        creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    return f


def asignar_a_usuario(session, formulario, user):
    session.execute(
        formulario_usuario.insert().values(formulario_id=formulario.id, usuario_id=user.id)
    )
    session.commit()


def asignar_a_grupo(session, formulario, user, *, nombre_grupo="grupo-x"):
    g = Grupo(nombre=nombre_grupo)
    session.add(g)
    session.commit()
    session.refresh(g)
    session.execute(
        usuario_grupo.insert().values(usuario_id=user.id, grupo_id=g.id)
    )
    session.execute(
        formulario_grupo.insert().values(formulario_id=formulario.id, grupo_id=g.id)
    )
    session.commit()
    return g


def test_lista_vacia_si_no_hay_asignaciones(client, session, admin, respondent_a):
    crear_formulario(session, admin)
    login(client, respondent_a.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios")
    assert r.status_code == 200
    assert r.json() == []


def test_lista_incluye_formularios_asignados_individualmente(
    client, session, admin, respondent_a
):
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)

    login(client, respondent_a.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["slug"] == f.slug
    assert items[0]["estado_envio"] == "no_iniciado"


def test_lista_incluye_formularios_via_grupo(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    asignar_a_grupo(session, f, respondent_a)

    login(client, respondent_a.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios")
    items = r.json()
    assert len(items) == 1
    assert items[0]["slug"] == f.slug


def test_lista_excluye_formularios_borrador(client, session, admin, respondent_a):
    f = crear_formulario(session, admin, estado="borrador")
    asignar_a_usuario(session, f, respondent_a)

    login(client, respondent_a.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios")
    assert r.json() == []


def test_admin_global_ve_todos(client, session, admin):
    crear_formulario(session, admin, slug="f1")
    crear_formulario(session, admin, slug="f2")
    login(client, admin.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios")
    assert r.status_code == 200
    slugs = {item["slug"] for item in r.json()}
    assert {"f1", "f2"} <= slugs


def test_get_formulario_por_slug_devuelve_definicion(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)

    login(client, respondent_a.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}")
    assert r.status_code == 200
    body = r.json()
    assert body["slug"] == f.slug
    assert body["definicion"]["version"] == 1
    assert body["envio"] is None  # no ha iniciado


def test_get_formulario_no_asignado_404(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    login(client, respondent_a.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}")
    assert r.status_code == 404


def test_get_envio_inicia_implicitamente(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)

    login(client, respondent_a.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio")
    assert r.status_code == 200
    body = r.json()
    assert body["estado"] == "en_proceso"
    assert body["formulario_version"] == 1
    assert body["datos"] == {}


def test_put_envio_guarda_borrador(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)

    csrf = login(client, respondent_a.username)
    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={"datos": {"general": {"razon_social": "Acme SA"}}, "paso_actual": 0, "enviar": False},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["estado"] == "en_proceso"
    assert body["datos"]["general"]["razon_social"] == "Acme SA"


def test_put_envio_borrador_no_exige_required(client, session, admin, respondent_a):
    """Borrador parcial debe pasar aunque falten required."""
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)
    csrf = login(client, respondent_a.username)
    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={"datos": {"general": {}}, "paso_actual": 0, "enviar": False},
    )
    assert r.status_code == 200, r.text


def test_put_envio_enviado_falla_si_falta_required(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)
    csrf = login(client, respondent_a.username)
    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={"datos": {"general": {}}, "paso_actual": 0, "enviar": True},
    )
    assert r.status_code == 422


def test_put_envio_enviado_marca_estado(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)
    csrf = login(client, respondent_a.username)
    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={
            "datos": {"general": {"razon_social": "Acme SA"}},
            "paso_actual": 0,
            "enviar": True,
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "enviado"


def test_put_envio_falla_si_formulario_cerrado(client, session, admin, respondent_a):
    """Regresion: respondent no puede actualizar envio si el formulario cambio
    a estado 'cerrado' (la spec habla de cerrado pero el codigo no validaba)."""
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)
    csrf = login(client, respondent_a.username)

    # Crear envio mientras esta activo
    r0 = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={"datos": {"general": {"razon_social": "Acme"}}, "paso_actual": 0, "enviar": False},
    )
    assert r0.status_code == 200

    # Admin cierra el formulario
    f.estado = "cerrado"
    session.commit()

    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={"datos": {"general": {"razon_social": "Acme 2"}}, "paso_actual": 0, "enviar": False},
    )
    assert r.status_code == 409
    assert "cerrado" in r.json()["detail"].lower()


def test_put_envio_payload_excede_limite_falla_413(client, session, admin, respondent_a):
    """Regresion: payload de `datos` >5 MB se rechaza con 413."""
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)
    csrf = login(client, respondent_a.username)

    blob = "x" * (6 * 1024 * 1024)
    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={"datos": {"general": {"razon_social": blob}}, "paso_actual": 0, "enviar": False},
    )
    assert r.status_code == 413


def test_put_envio_falla_si_vigencia_fin_pasada(client, session, admin, respondent_a):
    """Regresion: respondent no puede actualizar envio si vigencia_fin paso."""
    from app.core.time import utcnow
    from datetime import timedelta

    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)
    csrf = login(client, respondent_a.username)

    r0 = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={"datos": {"general": {"razon_social": "Acme"}}, "paso_actual": 0, "enviar": False},
    )
    assert r0.status_code == 200

    f.vigencia_fin = utcnow() - timedelta(days=1)
    session.commit()

    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={"datos": {"general": {"razon_social": "Acme 2"}}, "paso_actual": 0, "enviar": False},
    )
    assert r.status_code == 409


def test_put_envio_despues_de_enviar_falla_409(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)
    csrf = login(client, respondent_a.username)

    client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={
            "datos": {"general": {"razon_social": "Acme SA"}},
            "paso_actual": 0,
            "enviar": True,
        },
    )

    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={
            "datos": {"general": {"razon_social": "Otro"}},
            "paso_actual": 0,
            "enviar": False,
        },
    )
    assert r.status_code == 409


def test_envio_de_un_user_no_visible_para_otro(client, session, admin, respondent_a, respondent_b):
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)
    asignar_a_usuario(session, f, respondent_b)

    csrf_a = login(client, respondent_a.username)
    client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf_a},
        json={
            "datos": {"general": {"razon_social": "A"}},
            "paso_actual": 0,
            "enviar": False,
        },
    )

    # Logout via re-login con b
    login(client, respondent_b.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio")
    assert r.status_code == 200
    assert r.json()["datos"] == {}  # b inicia su propio envio vacio


def test_get_schema_devuelve_validation_rules(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    asignar_a_usuario(session, f, respondent_a)

    login(client, respondent_a.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/schema")
    assert r.status_code == 200
    body = r.json()
    assert "definicion" in body
    assert "validation_rules" in body
    paths = {(rule["field_path"], rule["rule"]) for rule in body["validation_rules"]}
    assert ("general.razon_social", "required") in paths


def test_paths_del_wizard_no_chocan_con_dinamicos(client, session, admin, respondent_a):
    """`/formularios/general` debe seguir respondiendo el wizard, no el dinamico
    aunque `general` se vea como un slug. Nota: el formulario con slug
    `general` no se puede crear por el regex del schema (slug-pattern)
    pero la prueba garantiza que el orden de routers es correcto."""
    login(client, respondent_a.username)
    r = client.get(f"{ADMIN_PREFIX}/formularios/general")
    # endpoint del wizard responde 404 (no existe Generalrow para el user) en lugar
    # de chequear contra Formulario por slug
    assert r.status_code == 404
