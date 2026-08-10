from datetime import datetime

import pytest

from tests.conftest import PERMISOS_REPORTAR, TODOS_LOS_PERMISOS, login_as
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
HUACHICOL_TABLES = [t for t in Base.metadata.sorted_tables if t.schema == "huachicol"]


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
        conn.execute(text("ATTACH DATABASE ':memory:' AS huachicol"))
        conn.commit()
    Base.metadata.create_all(bind=eng, tables=PUBLIC_TABLES + SIEEJ_TABLES + HUACHICOL_TABLES)
    yield eng
    Base.metadata.drop_all(bind=eng, tables=SIEEJ_TABLES + PUBLIC_TABLES + HUACHICOL_TABLES)


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


def login(client, user, permisos=None):
    if permisos is None:
        permisos = PERMISOS_REPORTAR if user.role == "externo" else TODOS_LOS_PERMISOS
    return login_as(client, user, permisos)


def test_admin_crea_formulario_estado_borrador(client, admin):
    csrf = login(client, admin)
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
    csrf = login(client, admin)
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

    csrf = login(client, admin)
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

    login(client, admin)
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

    csrf = login(client, admin)
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


def test_admin_reabrir_limpia_vigencia_vencida(client, session, admin):
    f = Formulario(
        slug="reab", nombre="Reab", definicion=DEFINICION_OK, estado="cerrado",
        version=1, creado_por_id=admin.id,
        vigencia_inicio=datetime(2026, 1, 1), vigencia_fin=datetime(2026, 2, 1),
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin)
    r = client.post(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/reabrir",
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["estado"] == "activo"
    assert body["vigencia_fin"] is None
    assert body["vigencia_inicio"] is not None


def test_admin_reabrir_formulario_activo_da_409(client, session, admin):
    f = Formulario(
        slug="reab-act", nombre="ReabAct", definicion=DEFINICION_OK, estado="activo",
        version=1, creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin)
    r = client.post(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/reabrir",
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 409


def test_admin_actualizar_slug(client, session, admin):
    f = Formulario(
        slug="viejo", nombre="Viejo", definicion=DEFINICION_OK, estado="activo",
        version=1, creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        json={"slug": "nuevo"},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 200
    assert r.json()["slug"] == "nuevo"


def test_admin_actualizar_slug_duplicado_falla_409(client, session, admin):
    session.add_all(
        [
            Formulario(
                slug="uno", nombre="Uno", definicion=DEFINICION_OK, estado="activo",
                version=1, creado_por_id=admin.id,
            ),
            Formulario(
                slug="dos", nombre="Dos", definicion=DEFINICION_OK, estado="activo",
                version=1, creado_por_id=admin.id,
            ),
        ]
    )
    session.commit()
    destino = session.query(Formulario).filter(Formulario.slug == "dos").first()

    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{destino.id}",
        json={"slug": "uno"},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 409


def test_admin_actualizar_slug_reservado_falla_400(client, session, admin):
    f = Formulario(
        slug="libre", nombre="Libre", definicion=DEFINICION_OK, estado="activo",
        version=1, creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        json={"slug": "mis-envios"},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 400


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
    csrf = login(client, admin)
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

    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={"nombre": "NoBump 2"},
    )
    assert r.status_code == 200
    assert r.json()["version"] == 1


def test_admin_actualizar_con_timestamp_viejo_da_409(client, session, admin):
    f = Formulario(
        slug="conc", nombre="Concurrente", definicion=DEFINICION_OK, estado="activo",
        version=1, creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={
            "nombre": "Pisado",
            "actualizado_en_esperado": "2020-01-01T00:00:00Z",
        },
    )
    assert r.status_code == 409, r.text
    assert "Otra persona" in r.json()["detail"]
    session.refresh(f)
    assert f.nombre == "Concurrente"


def test_admin_actualizar_con_timestamp_vigente_pasa(client, session, admin):
    f = Formulario(
        slug="conc-ok", nombre="Vigente", definicion=DEFINICION_OK, estado="activo",
        version=1, creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin)
    actual = client.get(f"{ADMIN_PREFIX}/sieej/formularios/{f.id}").json()
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={
            "nombre": "Vigente 2",
            "actualizado_en_esperado": actual["actualizado_en"],
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["nombre"] == "Vigente 2"
    assert r.json()["actualizado_por"]["id"] == admin.id


def test_admin_actualizar_sin_timestamp_no_valida_concurrencia(client, session, admin):
    f = Formulario(
        slug="conc-legacy", nombre="Legacy", definicion=DEFINICION_OK, estado="activo",
        version=1, creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={"nombre": "Legacy 2"},
    )
    assert r.status_code == 200, r.text


def _crear_form(session, admin, slug):
    f = Formulario(
        slug=slug, nombre=slug, definicion=DEFINICION_OK, estado="activo",
        version=1, creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    return f


def test_presencia_put_sin_csrf_da_403(client, session, admin):
    f = _crear_form(session, admin, "pres-csrf")
    login(client, admin)
    r = client.put(f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/presencia", json={})
    assert r.status_code == 403


def test_presencia_put_con_csrf_da_200(client, session, admin):
    f = _crear_form(session, admin, "pres-ok")
    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/presencia",
        headers={"X-CSRF-Token": csrf},
        json={"seccion": "definicion"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True


def test_presencia_degrada_sin_redis(client, session, admin):
    """Sin Redis (o si se cae), la presencia no debe tumbar el editor con 500;
    los GET responden vacio. En el runner de tests Redis no esta disponible,
    asi que este es el camino que se ejercita."""
    f = _crear_form(session, admin, "pres-degrada")
    login(client, admin)
    uno = client.get(f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/presencia")
    assert uno.status_code == 200
    assert uno.json() == []
    glob = client.get(f"{ADMIN_PREFIX}/sieej/formularios/presencia")
    assert glob.status_code == 200
    assert glob.json() == {}


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
    csrf = login(client, admin)
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
    csrf = login(client, admin)
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


def test_admin_exportar_envios_formatos(client, session, admin, respondent):
    f = Formulario(
        slug="exp", nombre="Exp", definicion=DEFINICION_OK, estado="activo", version=1, creado_por_id=admin.id
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
            datos={"general": {"razon": "ACME"}},
            paso_actual=0,
        )
    )
    session.commit()

    login(client, admin)
    r = client.get(f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/exportar-envios")
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers["content-type"]

    r = client.get(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/exportar-envios",
        params={"formato": "csv"},
    )
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "ACME" in r.content.decode("utf-8-sig")

    r = client.get(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/exportar-envios",
        params={"formato": "pdf"},
    )
    assert r.status_code == 422


def test_admin_delete_sin_envios_borra(client, session, admin):
    f = Formulario(
        slug="del", nombre="Del", definicion=DEFINICION_OK, estado="borrador", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin)
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

    csrf = login(client, admin)
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 200
    assert "cerrado" in r.json()["message"].lower()
    f_check = session.query(Formulario).filter(Formulario.id == f.id).first()
    assert f_check is not None
    assert f_check.estado == "cerrado"


def _form_con_envio(session, admin, respondent, slug, nombre):
    f = Formulario(
        slug=slug, nombre=nombre, definicion=DEFINICION_OK, estado="activo",
        version=1, creado_por_id=admin.id,
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
    return f


def test_admin_delete_con_envios_y_confirmacion_borra(
    client, session, admin, respondent
):
    f = _form_con_envio(session, admin, respondent, "dd", "Censo Municipal")

    csrf = login(client, admin)
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        params={"confirmacion": "Censo Municipal"},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 200
    assert "eliminado" in r.json()["message"].lower()
    assert session.query(Formulario).filter(Formulario.id == f.id).first() is None


def test_admin_delete_con_confirmacion_incorrecta_da_400(
    client, session, admin, respondent
):
    f = _form_con_envio(session, admin, respondent, "dd2", "Censo Municipal")

    csrf = login(client, admin)
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        params={"confirmacion": "censo municipal"},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 400
    f_check = session.query(Formulario).filter(Formulario.id == f.id).first()
    assert f_check is not None
    assert f_check.estado == "activo"


def test_admin_delete_definitivo_requiere_admin_global(
    client, session, admin, respondent, proyecto_sieej
):
    f = _form_con_envio(session, admin, respondent, "dd3", "Censo Municipal")
    editora = Usuario(
        username="edit_t",
        email="e@t.com",
        name="E",
        hashed_password=hash_password("testpass123"),
        role="editora",
    )
    session.add(editora)
    session.commit()
    session.refresh(editora)
    session.add(
        UserProject(
            user_id=editora.id, project_id=proyecto_sieej.id, project_role="editor"
        )
    )
    session.commit()

    csrf = login(client, editora, TODOS_LOS_PERMISOS - {"mariachi.sieej_formularios.delete"})
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        params={"confirmacion": "Censo Municipal"},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 403
    assert session.query(Formulario).filter(Formulario.id == f.id).first() is not None


def test_admin_eliminar_envio_con_confirmacion(client, session, admin, respondent):
    f = _form_con_envio(session, admin, respondent, "de", "Con Envio")
    envio = (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.formulario_id == f.id)
        .first()
    )

    csrf = login(client, admin)
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/envios/{envio.id}",
        params={"confirmacion": respondent.name},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 200
    assert (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.id == envio.id)
        .first()
        is None
    )
    assert session.query(Formulario).filter(Formulario.id == f.id).first() is not None


def test_admin_eliminar_envio_nombre_incorrecto_da_400(
    client, session, admin, respondent
):
    f = _form_con_envio(session, admin, respondent, "de2", "Con Envio")
    envio = (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.formulario_id == f.id)
        .first()
    )

    csrf = login(client, admin)
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/envios/{envio.id}",
        params={"confirmacion": "Otra Dependencia"},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 400
    assert (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.id == envio.id)
        .first()
        is not None
    )


def test_admin_eliminar_envio_requiere_admin_global(
    client, session, admin, respondent, proyecto_sieej
):
    f = _form_con_envio(session, admin, respondent, "de3", "Con Envio")
    envio = (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.formulario_id == f.id)
        .first()
    )
    editora = Usuario(
        username="edit_e",
        email="ee@t.com",
        name="EE",
        hashed_password=hash_password("testpass123"),
        role="editora",
    )
    session.add(editora)
    session.commit()
    session.refresh(editora)
    session.add(
        UserProject(
            user_id=editora.id, project_id=proyecto_sieej.id, project_role="editor"
        )
    )
    session.commit()

    csrf = login(client, editora, TODOS_LOS_PERMISOS - {"mariachi.sieej_formularios.delete"})
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/envios/{envio.id}",
        params={"confirmacion": respondent.name},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 403


def test_admin_actualizar_asignaciones_reemplaza_en_bloque(
    client, session, admin, respondent
):
    f = Formulario(
        slug="asg", nombre="Asg", definicion=DEFINICION_OK, estado="borrador", version=1, creado_por_id=admin.id
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin)
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

    csrf = login(client, admin)
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

    login(client, admin)
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

    login(client, admin)
    r = client.get(f"{ADMIN_PREFIX}/sieej/formularios/{f.id}/envios/{e.id}")
    assert r.status_code == 200
    assert r.json()["datos"]["general"]["razon"] == "Acme"


DEFINICION_CON_LIMITE = {
    "version": 1,
    "steps": [
        {
            "id": "general",
            "type": "form",
            "title": "General",
            "fields": [
                {
                    "name": "fecha_captura",
                    "label": "Fecha de captura",
                    "type": "date",
                    "validation": {"maxDate": "hoy"},
                }
            ],
        }
    ],
}


def test_admin_guarda_limite_de_fecha_y_lo_devuelve(client, session, admin):
    """El ciclo que hace el CMS: PUT con el limite -> se persiste tal cual
    (compat no lo descarta) -> el respondent lo recibe en la definicion."""
    f = Formulario(
        slug="lim", nombre="Lim", definicion=DEFINICION_OK, estado="activo",
        version=1, creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)

    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={"definicion": DEFINICION_CON_LIMITE},
    )
    assert r.status_code == 200, r.text

    guardado = r.json()["definicion"]["steps"][0]["fields"][0]
    assert guardado["validation"] == {"maxDate": "hoy"}

    session.refresh(f)
    en_bd = f.definicion["steps"][0]["fields"][0]
    assert en_bd["validation"] == {"maxDate": "hoy"}

    detalle = client.get(f"{ADMIN_PREFIX}/sieej/formularios/{f.id}")
    assert detalle.status_code == 200, detalle.text
    campo = detalle.json()["definicion"]["steps"][0]["fields"][0]
    assert campo["validation"] == {"maxDate": "hoy"}
