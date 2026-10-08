"""Tests del detalle y soft-delete respondent /formularios/mis-envios/{id}."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.core.settings import get_settings
from app.main import app
from app.models.project import Project, UserProject
from app.models.sieej import (
    EnvioArchivo,
    EnvioEvento,
    EnvioFormulario,
    Formulario,
    formulario_usuario,
)
from app.models.user import Usuario
from tests.conftest import PERMISOS_REPORTAR, TODOS_LOS_PERMISOS, login_as


def _is_pg_only(table) -> bool:
    return any(isinstance(col.type, (JSONB, ARRAY)) for col in table.columns)


settings = get_settings()
ADMIN_PREFIX = settings.admin_prefix
SIEEJ_TABLES = [
    t for t in Base.metadata.sorted_tables
    if t.schema == "sieej" and not _is_pg_only(t)
]
PUBLIC_TABLES = [
    t for t in Base.metadata.sorted_tables
    if t.schema is None and not _is_pg_only(t)
]


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


def _crear_externo(session, proyecto, suffix):
    u = Usuario(
        username=f"resp_{suffix}",
        email=f"{suffix}@test.com",
        name=f"Resp {suffix}",
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    session.add(UserProject(user_id=u.id, project_id=proyecto.id, project_role="editor"))
    session.commit()
    return u


@pytest.fixture(scope="function")
def respondent_a(session, proyecto_sieej):
    return _crear_externo(session, proyecto_sieej, "a")


@pytest.fixture(scope="function")
def respondent_b(session, proyecto_sieej):
    return _crear_externo(session, proyecto_sieej, "b")


def login(client, user, permisos=None):
    if permisos is None:
        permisos = PERMISOS_REPORTAR if user.role == "externo" else TODOS_LOS_PERMISOS
    return login_as(client, user, permisos)


def crear_formulario(session, admin, *, slug="form-test", nombre="Form Test"):
    f = Formulario(
        slug=slug,
        nombre=nombre,
        descripcion="desc",
        definicion=DEFINICION_DEMO,
        estado="activo",
        publico=False,
        version=1,
        creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    session.execute(
        formulario_usuario.insert().values(formulario_id=f.id, usuario_id=admin.id)
    )
    session.commit()
    return f


def crear_envio(
    session,
    formulario,
    user,
    *,
    estado="en_proceso",
    datos=None,
    enviado_en=None,
    paso_actual=0,
):
    e = EnvioFormulario(
        formulario_id=formulario.id,
        formulario_version=formulario.version,
        definicion_snapshot=formulario.definicion,
        usuario_id=user.id,
        estado=estado,
        datos=datos or {},
        paso_actual=paso_actual,
        enviado_en=enviado_en,
    )
    session.add(e)
    session.commit()
    session.refresh(e)
    return e


# ---------------------------------------------------------------------------
# Detalle
# ---------------------------------------------------------------------------


def test_detalle_sin_sesion_401(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    envio = crear_envio(session, f, respondent_a)
    r = client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/{envio.id}")
    assert r.status_code == 401


def test_detalle_propio_devuelve_snapshot_datos_archivos_eventos(
    client, session, admin, respondent_a
):
    f = crear_formulario(session, admin)
    envio = crear_envio(
        session, f, respondent_a,
        datos={"general": {"razon_social": "Acme SA"}},
    )
    # Evento manual + archivo
    session.add(EnvioEvento(envio_id=envio.id, tipo="iniciado", actor_usuario_id=respondent_a.id))
    session.add(
        EnvioArchivo(
            envio_id=envio.id,
            field_path="general.archivo",
            bucket="sieej-diccionarios",
            object_key="x.pdf",
            url_publica="https://example/x.pdf",
            filename_original="x.pdf",
            mime="application/pdf",
            size_bytes=10,
        )
    )
    session.commit()

    login(client, respondent_a)
    r = client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/{envio.id}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == envio.id
    assert body["formulario"]["slug"] == f.slug
    assert body["datos"] == {"general": {"razon_social": "Acme SA"}}
    assert body["definicion_snapshot"]["version"] == 1
    assert len(body["archivos"]) == 1
    assert body["archivos"][0]["url_publica"] == "https://example/x.pdf"
    assert len(body["eventos"]) == 1
    assert body["eventos"][0]["tipo"] == "iniciado"


def test_detalle_no_expone_actor_usuario_id(
    client, session, admin, respondent_a
):
    f = crear_formulario(session, admin)
    envio = crear_envio(session, f, respondent_a)
    session.add(
        EnvioEvento(envio_id=envio.id, tipo="reabierto", actor_usuario_id=admin.id)
    )
    session.commit()
    login(client, respondent_a)
    r = client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/{envio.id}")
    assert r.status_code == 200
    eventos = r.json()["eventos"]
    assert all("actor_usuario_id" not in ev for ev in eventos)


def test_detalle_otro_user_403(client, session, admin, respondent_a, respondent_b):
    f = crear_formulario(session, admin)
    envio_b = crear_envio(session, f, respondent_b)

    login(client, respondent_a)
    r = client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/{envio_b.id}")
    assert r.status_code == 403


def test_detalle_inexistente_404(client, session, admin, respondent_a):
    login(client, respondent_a)
    r = client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/99999")
    assert r.status_code == 404


def test_detalle_usa_definicion_snapshot_no_actual(
    client, session, admin, respondent_a
):
    """Si el formulario cambia despues del envio, el detalle muestra la
    definicion del momento en que el envio se inicio.
    """
    f = crear_formulario(session, admin)
    envio = crear_envio(session, f, respondent_a)
    # Mutar la definicion del formulario (simula edicion admin posterior)
    f.definicion = {
        "version": 2,
        "steps": [
            {
                "id": "otro",
                "type": "form",
                "title": "Cambio post-envio",
                "fields": [{"name": "x", "type": "text", "label": "X", "required": False}],
            }
        ],
    }
    session.commit()

    login(client, respondent_a)
    r = client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/{envio.id}")
    snapshot = r.json()["definicion_snapshot"]
    assert snapshot["version"] == 1
    assert snapshot["steps"][0]["id"] == "general"


def test_eliminar_mi_envio_lo_oculta_del_detalle(client, session, admin, respondent_a):
    f = crear_formulario(session, admin)
    envio = crear_envio(session, f, respondent_a)

    csrf = login(client, respondent_a)
    r0 = client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/{envio.id}")
    assert r0.status_code == 200

    r1 = client.delete(
        f"{ADMIN_PREFIX}/formularios/mis-envios/{envio.id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r1.status_code == 204

    r2 = client.get(f"{ADMIN_PREFIX}/formularios/mis-envios/{envio.id}")
    assert r2.status_code == 404


def test_eliminar_mi_envio_no_elimina_db(client, session, admin, respondent_a):
    """Soft-delete: el envio sigue en la DB para que el admin lo vea."""
    from app.models.sieej import EnvioFormulario

    f = crear_formulario(session, admin)
    envio = crear_envio(session, f, respondent_a)
    envio_id = envio.id

    csrf = login(client, respondent_a)
    client.delete(
        f"{ADMIN_PREFIX}/formularios/mis-envios/{envio_id}",
        headers={"X-CSRF-Token": csrf},
    )

    persistido = (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.id == envio_id)
        .first()
    )
    assert persistido is not None
    assert persistido.eliminado_en is not None


def test_eliminar_mi_envio_de_otro_user_403(client, session, admin, respondent_a, respondent_b):
    f = crear_formulario(session, admin)
    envio_b = crear_envio(session, f, respondent_b)

    csrf = login(client, respondent_a)
    r = client.delete(
        f"{ADMIN_PREFIX}/formularios/mis-envios/{envio_b.id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 403


def test_eliminar_mi_envio_re_eliminar_404(client, session, admin, respondent_a):
    """Idempotencia: re-DELETE de un envio ya eliminado devuelve 404."""
    f = crear_formulario(session, admin)
    envio = crear_envio(session, f, respondent_a)

    csrf = login(client, respondent_a)
    r1 = client.delete(
        f"{ADMIN_PREFIX}/formularios/mis-envios/{envio.id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r1.status_code == 204
    r2 = client.delete(
        f"{ADMIN_PREFIX}/formularios/mis-envios/{envio.id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r2.status_code == 404


def test_slug_mis_envios_reservado(client, session, admin):
    """Admin no puede crear un formulario con slug `mis-envios`."""
    csrf = login(client, admin)
    r = client.post(
        f"{ADMIN_PREFIX}/sieej/formularios",
        headers={"X-CSRF-Token": csrf},
        json={
            "slug": "mis-envios",
            "nombre": "Hijack",
            "descripcion": "Intento de colision con la ruta",
            "definicion": DEFINICION_DEMO,
            "publico": False,
        },
    )
    assert r.status_code == 400
    assert "reservado" in r.json()["detail"].lower()
