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
    EnvioFormulario,
    Formulario,
    FormularioVersion,
    formulario_usuario,
)
from app.models.user import Usuario

settings = get_settings()
ADMIN_PREFIX = settings.admin_prefix
SIEEJ_TABLES = [t for t in Base.metadata.sorted_tables if t.schema == "sieej"]
PUBLIC_TABLES = [t for t in Base.metadata.sorted_tables if t.schema is None]


DEFINICION_OK = {
    "version": 1,
    "steps": [
        {
            "id": "general",
            "type": "form",
            "title": "General",
            "fields": [{"name": "razon", "label": "Razon", "type": "text", "required": True}],
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
def proyecto_sieej(session):
    p = Project(slug="sieej", name="SIEEJ", description="t", is_active=True)
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


@pytest.fixture(scope="function")
def admin(session):
    u = Usuario(
        username="admin_t",
        email="admin@t.com",
        name="Admin",
        hashed_password=hash_password("testpass123"),
        role="tetlamamakani",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


@pytest.fixture(scope="function")
def respondent(session, proyecto_sieej):
    u = Usuario(
        username="resp_t",
        email="r@t.com",
        name="R",
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


def test_admin_crea_formulario_estado_borrador(client, admin):
    csrf = login(client, admin.username)
    r = client.post(
        f"{ADMIN_PREFIX}/sieej/formularios",
        headers={"X-CSRF-Token": csrf},
        json={
            "slug": "form-x",
            "nombre": "Form X",
            "descripcion": "test",
            "definicion": DEFINICION_OK,
            "publico": False,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["estado"] == "borrador"
    assert body["version"] == 1


def test_admin_crear_definicion_invalida_falla_422(client, admin):
    csrf = login(client, admin.username)
    r = client.post(
        f"{ADMIN_PREFIX}/sieej/formularios",
        headers={"X-CSRF-Token": csrf},
        json={
            "slug": "form-y",
            "nombre": "Form Y",
            "definicion": {"version": 1, "steps": []},  # vacio
        },
    )
    assert r.status_code == 422


def test_admin_crear_slug_duplicado_falla_409(client, session, admin):
    session.add(
        Formulario(
            slug="dup",
            nombre="Original",
            definicion=DEFINICION_OK,
            estado="borrador",
            version=1,
            creado_por_id=admin.id,
        )
    )
    session.commit()

    csrf = login(client, admin.username)
    r = client.post(
        f"{ADMIN_PREFIX}/sieej/formularios",
        headers={"X-CSRF-Token": csrf},
        json={"slug": "dup", "nombre": "Otro", "definicion": DEFINICION_OK},
    )
    assert r.status_code == 409


def test_admin_lista_formularios_filtra_por_estado(client, session, admin):
    session.add_all(
        [
            Formulario(slug="b1", nombre="B1", definicion=DEFINICION_OK, estado="borrador", version=1, creado_por_id=admin.id),
            Formulario(slug="a1", nombre="A1", definicion=DEFINICION_OK, estado="activo", version=1, creado_por_id=admin.id),
        ]
    )
    session.commit()

    login(client, admin.username)
    r = client.get(f"{ADMIN_PREFIX}/sieej/formularios?estado=activo")
    assert r.status_code == 200
    slugs = [f["slug"] for f in r.json()]
    assert slugs == ["a1"]


def test_admin_publicar_y_cerrar(client, session, admin):
    f = Formulario(
        slug="pub", nombre="Pub", definicion=DEFINICION_OK, estado="borrador", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin.username)
    r1 = client.post(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/publicar",
        headers={"X-CSRF-Token": csrf},
    )
    assert r1.status_code == 200
    assert r1.json()["estado"] == "activo"

    r2 = client.post(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/cerrar",
        headers={"X-CSRF-Token": csrf},
    )
    assert r2.status_code == 200
    assert r2.json()["estado"] == "cerrado"


def test_admin_actualizar_definicion_bumpea_version_si_hay_envios(
    client, session, admin, respondent
):
    f = Formulario(
        slug="v", nombre="V", definicion=DEFINICION_OK, estado="activo", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    session.add(
        EnvioFormulario(
            formulario_id=f.id,
            formulario_version=1,
            definicion_snapshot=DEFINICION_OK,
            usuario_id=respondent.id,
            estado="en_proceso",
            datos={},
            paso_actual=0,
        )
    )
    session.commit()

    nueva_def = {
        "version": 1,
        "steps": [
            {
                "id": "general",
                "type": "form",
                "title": "General mod",
                "fields": [
                    {"name": "razon", "label": "Razon", "type": "text", "required": True},
                    {"name": "rfc", "label": "RFC", "type": "text", "required": True},
                ],
            }
        ],
    }
    csrf = login(client, admin.username)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={"definicion": nueva_def},
    )
    assert r.status_code == 200, r.text
    assert r.json()["version"] == 2


def test_admin_actualizar_sin_cambiar_definicion_no_bumpea(client, session, admin):
    f = Formulario(
        slug="nb", nombre="NoBump", definicion=DEFINICION_OK, estado="activo", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin.username)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={"nombre": "NoBump 2"},
    )
    assert r.status_code == 200
    assert r.json()["version"] == 1


def test_admin_cambio_rompe_archiva_definicion_previa(
    client, session, admin, respondent
):
    f = Formulario(
        slug="hist", nombre="Hist", definicion=DEFINICION_OK, estado="activo", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    session.add(
        EnvioFormulario(
            formulario_id=f.id,
            formulario_version=1,
            definicion_snapshot=DEFINICION_OK,
            usuario_id=respondent.id,
            estado="en_proceso",
            datos={},
            paso_actual=0,
        )
    )
    session.commit()

    nueva_def = {
        "version": 1,
        "steps": [
            {
                "id": "general",
                "type": "form",
                "title": "General",
                "fields": [
                    {"name": "razon", "label": "Razon", "type": "text", "required": True},
                    {"name": "rfc", "label": "RFC", "type": "text", "required": True},
                ],
            }
        ],
    }
    csrf = login(client, admin.username)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={"definicion": nueva_def},
    )
    assert r.status_code == 200, r.text
    assert r.json()["version"] == 2

    archivadas = (
        session.query(FormularioVersion)
        .filter(FormularioVersion.formulario_id == f.id)
        .all()
    )
    assert len(archivadas) == 1
    assert archivadas[0].version == 1
    assert archivadas[0].definicion == DEFINICION_OK
    assert archivadas[0].actor_usuario_id == admin.id


def test_admin_cambio_menor_no_archiva(client, session, admin, respondent):
    f = Formulario(
        slug="hist-m", nombre="HistM", definicion=DEFINICION_OK, estado="activo", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    session.add(
        EnvioFormulario(
            formulario_id=f.id,
            formulario_version=1,
            definicion_snapshot=DEFINICION_OK,
            usuario_id=respondent.id,
            estado="en_proceso",
            datos={},
            paso_actual=0,
        )
    )
    session.commit()

    nueva_def = {
        "version": 1,
        "steps": [
            {
                "id": "general",
                "type": "form",
                "title": "General",
                "fields": [
                    {"name": "razon", "label": "Razon social", "type": "text", "required": True},
                ],
            }
        ],
    }
    csrf = login(client, admin.username)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={"definicion": nueva_def},
    )
    assert r.status_code == 200, r.text
    assert r.json()["version"] == 1
    assert (
        session.query(FormularioVersion)
        .filter(FormularioVersion.formulario_id == f.id)
        .count()
    ) == 0


def test_admin_delete_sin_envios_borra(client, session, admin):
    f = Formulario(
        slug="del", nombre="Del", definicion=DEFINICION_OK, estado="borrador", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin.username)
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 200
    assert "eliminado" in r.json()["message"].lower()
    assert session.query(Formulario).filter(Formulario.id == f.id).first() is None


def test_admin_delete_con_envios_lo_cierra(client, session, admin, respondent):
    f = Formulario(
        slug="dc", nombre="DC", definicion=DEFINICION_OK, estado="activo", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    session.add(
        EnvioFormulario(
            formulario_id=f.id,
            formulario_version=1,
            definicion_snapshot=DEFINICION_OK,
            usuario_id=respondent.id,
            estado="enviado",
            datos={},
            paso_actual=0,
        )
    )
    session.commit()

    csrf = login(client, admin.username)
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 200
    assert "cerrado" in r.json()["message"].lower()
    f_check = session.query(Formulario).filter(Formulario.id == f.id).first()
    assert f_check is not None
    assert f_check.estado == "cerrado"


def test_admin_actualizar_asignaciones_reemplaza_en_bloque(
    client, session, admin, respondent
):
    f = Formulario(
        slug="asg", nombre="Asg", definicion=DEFINICION_OK, estado="borrador", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin.username)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/asignaciones",
        headers={"X-CSRF-Token": csrf},
        json={"grupos": [], "usuarios": [respondent.id]},
    )
    assert r.status_code == 200, r.text

    rows = session.query(formulario_usuario).filter(
        formulario_usuario.c.formulario_id == f.id
    ).all()
    assert len(rows) == 1

    # reemplaza con vacio
    r2 = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/asignaciones",
        headers={"X-CSRF-Token": csrf},
        json={"grupos": [], "usuarios": []},
    )
    assert r2.status_code == 200
    assert (
        session.query(formulario_usuario)
        .filter(formulario_usuario.c.formulario_id == f.id)
        .count()
        == 0
    )


def test_admin_asignaciones_usuario_inexistente_falla(client, session, admin):
    f = Formulario(
        slug="asgx", nombre="X", definicion=DEFINICION_OK, estado="borrador", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin.username)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/asignaciones",
        headers={"X-CSRF-Token": csrf},
        json={"grupos": [], "usuarios": [99999]},
    )
    assert r.status_code == 400


def test_admin_listar_envios_paginado(client, session, admin, respondent, proyecto_sieej):
    f = Formulario(
        slug="le", nombre="LE", definicion=DEFINICION_OK, estado="activo", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    # crear 3 envios usando 3 users distintos
    for i in range(3):
        u = Usuario(
            username=f"u_{i}",
            email=f"u{i}@t.com",
            name=f"U{i}",
            hashed_password=hash_password("testpass123"),
            role="externo",
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        session.add(
            EnvioFormulario(
                formulario_id=f.id,
                formulario_version=1,
                definicion_snapshot=DEFINICION_OK,
                usuario_id=u.id,
                estado="enviado" if i < 2 else "en_proceso",
                datos={},
                paso_actual=0,
            )
        )
    session.commit()

    login(client, admin.username)
    r = client.get(f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/envios?limit=2")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2

    r2 = client.get(f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/envios?estado=enviado")
    assert r2.json()["total"] == 2


def test_admin_get_envio_individual(client, session, admin, respondent):
    f = Formulario(
        slug="ge", nombre="GE", definicion=DEFINICION_OK, estado="activo", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    e = EnvioFormulario(
        formulario_id=f.id,
        formulario_version=1,
        definicion_snapshot=DEFINICION_OK,
        usuario_id=respondent.id,
        estado="en_proceso",
        datos={"general": {"razon": "Acme"}},
        paso_actual=0,
    )
    session.add(e)
    session.commit()
    session.refresh(e)

    login(client, admin.username)
    r = client.get(f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/envios/{e.id}")
    assert r.status_code == 200
    assert r.json()["datos"]["general"]["razon"] == "Acme"
