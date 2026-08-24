"""Tests de los envios de grupo: identidad del envio, autorizacion y rol."""
from datetime import timedelta

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
    EnvioFormulario,
    EnvioValorHistorial,
    Formulario,
    Grupo,
    formulario_grupo,
    usuario_grupo,
)
from app.models.user import Usuario
from app.services import presence
from app.services.sieej.campos_service import VENTANA_COALESCING
from app.services.sieej.formularios_admin_service import FormulariosAdminService
from app.services.sieej.grupos_service import GruposService
from app.services.sieej.xlsx_service import build_envios_tables
from tests.conftest import PERMISOS_REPORTAR, TODOS_LOS_PERMISOS, login_as
from tests.test_rate_limit_scopes import _FakeRedis as _FakeRedisZset
from tests.test_sieej_presencia_hash import _FakeRedis as _FakeRedisHash

settings = get_settings()
ADMIN_PREFIX = settings.admin_prefix
SIEEJ_TABLES = [t for t in Base.metadata.sorted_tables if t.schema == "sieej"]
PUBLIC_TABLES = [t for t in Base.metadata.sorted_tables if t.schema is None]
HUACHICOL_TABLES = [t for t in Base.metadata.sorted_tables if t.schema == "huachicol"]


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
                {
                    "name": "contacto",
                    "label": "Contacto",
                    "type": "text",
                },
                {
                    "name": "telefono",
                    "label": "Telefono",
                    "type": "text",
                    "editableAfterSubmit": True,
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
        conn.execute(text("ATTACH DATABASE ':memory:' AS huachicol"))
        conn.commit()
    Base.metadata.create_all(
        bind=eng, tables=PUBLIC_TABLES + SIEEJ_TABLES + HUACHICOL_TABLES,
    )
    yield eng
    Base.metadata.drop_all(
        bind=eng, tables=HUACHICOL_TABLES + SIEEJ_TABLES + PUBLIC_TABLES,
    )


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


def patch_campos(client, csrf, slug, campos, desde=0):
    return client.patch(
        f"{ADMIN_PREFIX}/formularios/{slug}/envio/campos",
        headers={"X-CSRF-Token": csrf},
        json={"campos": campos, "desde": desde},
    )


def envio_colaborativo(session, admin, ana, beto, slug, nombre_grupo):
    f = crear_formulario(session, admin, slug=slug, colaborativo=True)
    grupo = crear_grupo(session, nombre_grupo, [ana, beto])
    asignar_grupo(session, f, grupo)
    return f, grupo


def test_dos_capturas_sobre_campos_distintos_no_se_pisan(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-7", "dep-cap-1")

    csrf = login(client, ana)
    r_ana = patch_campos(
        client, csrf, f.slug, {"general.razon_social": "Acme SA"}, desde=0
    )
    assert r_ana.status_code == 200, r_ana.text
    version_ana = r_ana.json()["datos_version"]

    csrf = login(client, beto)
    r_beto = patch_campos(
        client, csrf, f.slug, {"general.contacto": "Beto"}, desde=0
    )
    assert r_beto.status_code == 200, r_beto.text

    assert r_beto.json()["datos_version"] == version_ana + 1
    delta = {c["field_path"]: c for c in r_beto.json()["cambios"]}
    assert delta["general.razon_social"]["valor_nuevo"] == "Acme SA"
    assert delta["general.razon_social"]["actor_nombre"] == "Ana Lopez"
    assert delta["general.contacto"]["actor_nombre"] == "Beto Ruiz"

    login(client, ana)
    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    assert envio["datos"]["general"] == {
        "razon_social": "Acme SA",
        "contacto": "Beto",
    }


def test_el_mismo_campo_con_desde_atrasado_es_409_con_los_dos_valores(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-8", "dep-cap-2")

    csrf = login(client, ana)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"}, desde=0)

    csrf = login(client, beto)
    r = patch_campos(
        client, csrf, f.slug, {"general.razon_social": "Otra SA"}, desde=0
    )
    assert r.status_code == 409
    detail = r.json()["detail"]
    assert detail["codigo"] == "conflicto_por_campo"
    campo = detail["campos"][0]
    assert campo["field_path"] == "general.razon_social"
    assert campo["valor_tuyo"] == "Otra SA"
    assert campo["valor_actual"] == "Acme SA"
    assert campo["actor_nombre"] == "Ana Lopez"

    login(client, ana)
    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    assert envio["datos"]["general"]["razon_social"] == "Acme SA"


def test_el_conflicto_no_escribe_ninguno_de_los_campos_del_lote(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-9", "dep-cap-3")

    csrf = login(client, ana)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"}, desde=0)

    csrf = login(client, beto)
    r = patch_campos(
        client,
        csrf,
        f.slug,
        {"general.razon_social": "Otra SA", "general.contacto": "Beto"},
        desde=0,
    )
    assert r.status_code == 409

    login(client, ana)
    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    assert "contacto" not in envio["datos"]["general"]


def test_un_desde_atrasado_sin_choque_de_campos_si_se_aplica(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-10", "dep-cap-4")

    csrf = login(client, ana)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"}, desde=0)

    csrf = login(client, beto)
    r = patch_campos(client, csrf, f.slug, {"general.contacto": "Beto"}, desde=0)
    assert r.status_code == 200, r.text


def test_el_put_de_captura_esta_cerrado_en_un_envio_de_grupo(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-11", "dep-cap-5")

    csrf = login(client, ana)
    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={
            "datos": {"general": {"razon_social": "Acme SA"}},
            "paso_actual": 0,
            "enviar": False,
        },
    )
    assert r.status_code == 409
    assert "PATCH" in r.json()["detail"]


def test_solo_el_coordinador_puede_enviar(session, client, admin, ana, beto):
    f, grupo = envio_colaborativo(session, admin, ana, beto, "colab-12", "dep-cap-6")
    session.execute(
        usuario_grupo.update()
        .where(
            usuario_grupo.c.grupo_id == grupo.id,
            usuario_grupo.c.usuario_id == ana.id,
        )
        .values(rol="coordinador")
    )
    session.commit()

    csrf = login(client, beto)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"}, desde=0)
    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()

    cuerpo = {"datos": envio["datos"], "paso_actual": 0, "enviar": True}
    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json=cuerpo,
    )
    assert r.status_code == 403

    csrf = login(client, ana)
    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json=cuerpo,
    )
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "enviado"


def test_dos_ediciones_seguidas_del_mismo_actor_dejan_una_sola_fila(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-13", "dep-cap-7")

    csrf = login(client, ana)
    r1 = patch_campos(client, csrf, f.slug, {"general.contacto": "Ana"}, desde=0)
    r2 = patch_campos(
        client,
        csrf,
        f.slug,
        {"general.contacto": "Ana Lopez"},
        desde=r1.json()["datos_version"],
    )
    assert r2.status_code == 200, r2.text

    filas = (
        session.query(EnvioValorHistorial)
        .filter(EnvioValorHistorial.field_path == "general.contacto")
        .all()
    )
    assert len(filas) == 1
    assert filas[0].valor_anterior is None
    assert filas[0].valor_nuevo == "Ana Lopez"
    assert filas[0].datos_version == r2.json()["datos_version"]


def test_pasada_la_ventana_la_segunda_edicion_deja_su_propia_fila(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-14", "dep-cap-8")

    csrf = login(client, ana)
    r1 = patch_campos(client, csrf, f.slug, {"general.contacto": "Ana"}, desde=0)

    fila = (
        session.query(EnvioValorHistorial)
        .filter(EnvioValorHistorial.field_path == "general.contacto")
        .one()
    )
    fila.cambiado_en = fila.cambiado_en - VENTANA_COALESCING - timedelta(minutes=1)
    session.commit()

    patch_campos(
        client,
        csrf,
        f.slug,
        {"general.contacto": "Ana Lopez"},
        desde=r1.json()["datos_version"],
    )
    filas = (
        session.query(EnvioValorHistorial)
        .filter(EnvioValorHistorial.field_path == "general.contacto")
        .all()
    )
    assert len(filas) == 2


def test_la_correccion_post_envio_nunca_colapsa(session, client, admin, ana):
    f = crear_formulario(session, admin, slug="indiv-2", colaborativo=False)
    asignar_grupo(session, f, crear_grupo(session, "dep-cap-9", [ana]))

    csrf = login(client, ana)
    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={
            "datos": {"general": {"razon_social": "Acme SA", "telefono": "111"}},
            "paso_actual": 0,
            "enviar": True,
        },
    )
    assert r.status_code == 200, r.text
    envio_id = r.json()["id"]

    for valor in ("222", "333"):
        rr = client.put(
            f"{ADMIN_PREFIX}/formularios/mis-envios/{envio_id}/actualizar-campos",
            headers={"X-CSRF-Token": csrf},
            json={"campos": {"general.telefono": valor}},
        )
        assert rr.status_code == 200, rr.text

    filas = (
        session.query(EnvioValorHistorial)
        .filter(
            EnvioValorHistorial.envio_id == envio_id,
            EnvioValorHistorial.field_path == "general.telefono",
            EnvioValorHistorial.origen == "correccion",
        )
        .all()
    )
    assert len(filas) == 2


def test_el_guardado_normal_de_un_formulario_individual_deja_autoria(
    session, client, admin, ana
):
    f = crear_formulario(session, admin, slug="indiv-3", colaborativo=False)
    asignar_grupo(session, f, crear_grupo(session, "dep-cap-10", [ana]))

    csrf = login(client, ana)
    r = client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={
            "datos": {"general": {"razon_social": "Acme SA"}},
            "paso_actual": 0,
            "enviar": False,
        },
    )
    assert r.status_code == 200, r.text

    fila = (
        session.query(EnvioValorHistorial)
        .filter(EnvioValorHistorial.field_path == "general.razon_social")
        .one()
    )
    assert fila.origen == "captura"
    assert fila.actor_usuario_id == ana.id
    assert fila.valor_nuevo == "Acme SA"


@pytest.fixture
def presencia_fake(monkeypatch):
    fake = _FakeRedisHash()
    monkeypatch.setattr(presence, "redis_client", fake)
    return fake


def sync(client, csrf, slug, **body):
    return client.post(
        f"{ADMIN_PREFIX}/formularios/{slug}/envio/sync",
        headers={"X-CSRF-Token": csrf},
        json=body,
    )


def test_el_sync_trae_version_estado_y_delta(
    session, client, admin, ana, beto, presencia_fake
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-15", "dep-sync-1")

    csrf = login(client, ana)
    r = patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"})
    version = r.json()["datos_version"]

    csrf = login(client, beto)
    r = sync(client, csrf, f.slug, desde=0, seccion="general")
    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["datos_version"] == version
    assert cuerpo["estado"] == "en_proceso"
    cambio = cuerpo["cambios"][0]
    assert cambio["field_path"] == "general.razon_social"
    assert cambio["actor_nombre"] == "Ana Lopez"


def test_el_sync_al_dia_no_repite_lo_que_el_cliente_ya_tiene(
    session, client, admin, ana, beto, presencia_fake
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-16", "dep-sync-2")

    csrf = login(client, ana)
    r = patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"})
    version = r.json()["datos_version"]

    csrf = login(client, beto)
    r = sync(client, csrf, f.slug, desde=version, seccion="general")
    assert r.json()["cambios"] == []


def test_el_sync_muestra_en_que_paso_anda_el_companero(
    session, client, admin, ana, beto, presencia_fake
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-17", "dep-sync-3")

    csrf = login(client, ana)
    client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio")
    sync(client, csrf, f.slug, desde=0, seccion="general")

    csrf = login(client, beto)
    presentes = sync(client, csrf, f.slug, desde=0, seccion="anexos").json()[
        "presentes"
    ]
    assert len(presentes) == 1
    assert presentes[0]["username"] == "ana"
    assert presentes[0]["name"] == "Ana Lopez"
    assert presentes[0]["seccion"] == "general"


def test_salir_baja_la_presencia_sin_esperar_al_ttl(
    session, client, admin, ana, beto, presencia_fake
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-18", "dep-sync-4")

    csrf = login(client, ana)
    client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio")
    sync(client, csrf, f.slug, desde=0, seccion="general")
    r = sync(client, csrf, f.slug, desde=0, salir=True)
    assert r.status_code == 200
    assert r.json()["presentes"] == []

    csrf = login(client, beto)
    assert sync(client, csrf, f.slug, desde=0).json()["presentes"] == []


def test_con_redis_caido_el_sync_sigue_dando_el_delta(
    session, client, admin, ana, beto, presencia_fake
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-19", "dep-sync-5")

    csrf = login(client, ana)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"})

    presencia_fake.caido = True
    csrf = login(client, beto)
    r = sync(client, csrf, f.slug, desde=0, seccion="general")
    assert r.status_code == 200, r.text
    assert r.json()["cambios"][0]["field_path"] == "general.razon_social"
    assert r.json()["presentes"] == []


def test_sin_envio_todavia_el_sync_no_lo_crea(
    session, client, admin, ana, beto, presencia_fake
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-20", "dep-sync-6")

    csrf = login(client, ana)
    r = sync(client, csrf, f.slug, desde=0, seccion="general")
    assert r.status_code == 404


def test_el_polling_desbocado_de_un_cliente_se_corta(
    session, client, admin, ana, beto, presencia_fake, monkeypatch
):
    from app.api import rate_limit as rate_limit_module

    monkeypatch.setattr(rate_limit_module, "redis_client", _FakeRedisZset())
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-21", "dep-sync-7")

    csrf = login(client, ana)
    client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio")
    for _ in range(30):
        assert sync(client, csrf, f.slug, desde=0).status_code == 200

    r = sync(client, csrf, f.slug, desde=0)
    assert r.status_code == 429
    assert "Retry-After" in r.headers


def test_el_envio_dice_si_es_colaborativo_y_quien_puede_enviarlo(
    session, client, admin, ana, beto
):
    f, grupo = envio_colaborativo(session, admin, ana, beto, "colab-22", "dep-rol-1")
    session.execute(
        usuario_grupo.update()
        .where(
            usuario_grupo.c.grupo_id == grupo.id,
            usuario_grupo.c.usuario_id == ana.id,
        )
        .values(rol="coordinador")
    )
    session.commit()

    login(client, ana)
    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    assert envio["colaborativo"] is True
    assert envio["grupo_id"] == grupo.id
    assert envio["puede_enviar"] is True
    assert envio["datos_version"] == 0

    login(client, beto)
    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    assert envio["puede_enviar"] is False


def test_en_un_formulario_individual_el_dueno_siempre_puede_enviar(
    session, client, admin, ana
):
    f = crear_formulario(session, admin, slug="indiv-4", colaborativo=False)
    asignar_grupo(session, f, crear_grupo(session, "dep-rol-2", [ana]))

    login(client, ana)
    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    assert envio["colaborativo"] is False
    assert envio["grupo_id"] is None
    assert envio["puede_enviar"] is True


def test_la_version_avanza_con_cada_captura(session, client, admin, ana, beto):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-23", "dep-rol-3")

    csrf = login(client, ana)
    client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio")
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"})

    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    assert envio["datos_version"] == 1


def test_la_autoria_por_campo_viaja_con_el_envio(session, client, admin, ana, beto):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-24", "dep-aut-1")

    csrf = login(client, ana)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"})
    csrf = login(client, beto)
    patch_campos(client, csrf, f.slug, {"general.contacto": "Beto"}, desde=1)

    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    autoria = envio["autoria"]
    assert autoria["general.razon_social"]["actor_nombre"] == "Ana Lopez"
    assert autoria["general.contacto"]["actor_nombre"] == "Beto Ruiz"
    assert autoria["general.razon_social"]["cambiado_en"]


def test_la_autoria_se_queda_con_el_ultimo_que_toco_el_campo(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-25", "dep-aut-2")

    csrf = login(client, ana)
    r = patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme"})
    csrf = login(client, beto)
    patch_campos(
        client, csrf, f.slug,
        {"general.razon_social": "Acme SA"},
        desde=r.json()["datos_version"],
    )

    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    assert envio["autoria"]["general.razon_social"]["actor_nombre"] == "Beto Ruiz"


def test_en_un_individual_la_autoria_da_fecha_pero_no_nombre(
    session, client, admin, ana
):
    f = crear_formulario(session, admin, slug="indiv-5", colaborativo=False)
    asignar_grupo(session, f, crear_grupo(session, "dep-aut-3", [ana]))

    csrf = login(client, ana)
    client.put(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio",
        headers={"X-CSRF-Token": csrf},
        json={
            "datos": {"general": {"razon_social": "Acme SA"}},
            "paso_actual": 0,
            "enviar": False,
        },
    )

    envio = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    autoria = envio["autoria"]["general.razon_social"]
    assert autoria["actor_nombre"] is None
    assert autoria["cambiado_en"]


def test_el_historial_del_respondent_nombra_al_actor_solo_en_grupo(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-26", "dep-aut-4")

    csrf = login(client, ana)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"})
    envio_id = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()["id"]

    csrf = login(client, beto)
    historial = client.get(
        f"{ADMIN_PREFIX}/formularios/mis-envios/{envio_id}/historial"
    ).json()
    assert historial[0]["actor_nombre"] == "Ana Lopez"
    assert historial[0]["origen"] == "captura"
    assert "actor_email" not in historial[0]


def test_el_export_dice_quien_capturo_y_con_que_origen(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-27", "dep-exp-1")

    csrf = login(client, ana)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"})
    csrf = login(client, beto)
    patch_campos(client, csrf, f.slug, {"general.contacto": "Beto"}, desde=1)

    envios = (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.formulario_id == f.id)
        .all()
    )
    usuarios = {ana.id: ana, beto.id: beto}
    filas, capturistas = FormulariosAdminService(session).historial_export(
        f.id, envios, usuarios,
    )

    assert {fila["actor"] for fila in filas} == {"Ana Lopez", "Beto Ruiz"}
    assert {fila["origen"] for fila in filas} == {"captura"}
    assert set(capturistas[envios[0].id].split(", ")) == {"Ana Lopez", "Beto Ruiz"}

    tablas = build_envios_tables(
        [{
            "id": envios[0].id,
            "usuario_nombre": "Ana Lopez",
            "usuario_email": "ana@test.com",
            "capturado_por": capturistas[envios[0].id],
            "estado": "en_proceso",
            "formulario_version": 1,
            "enviado_en": "",
            "datos": envios[0].datos,
            "definicion": envios[0].definicion_snapshot,
        }],
        historial=filas,
    )
    envios_tabla = tablas[0]
    assert "Capturado por" in envios_tabla["headers"]
    columna = envios_tabla["headers"].index("Capturado por")
    assert "Ana Lopez" in envios_tabla["rows"][0][columna]

    historial_tabla = tablas[-1]
    assert historial_tabla["title"] == "Historial de cambios"
    assert "Origen" in historial_tabla["headers"]
    assert historial_tabla["rows"][0][historial_tabla["headers"].index("Origen")] == "Captura"


def test_el_dueno_del_envio_no_es_quien_capturo(session, client, admin, ana, beto):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-28", "dep-exp-2")

    csrf = login(client, ana)
    client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio")
    csrf = login(client, beto)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"})

    envios = (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.formulario_id == f.id)
        .all()
    )
    _filas, capturistas = FormulariosAdminService(session).historial_export(
        f.id, envios, {ana.id: ana, beto.id: beto},
    )

    assert envios[0].usuario_id == ana.id
    assert capturistas[envios[0].id] == "Beto Ruiz"


def test_la_linea_de_tiempo_del_envio_nombra_a_cada_actor(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "colab-29", "dep-exp-3")

    csrf = login(client, ana)
    client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio")
    csrf = login(client, beto)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"})
    envio_id = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()["id"]

    eventos = FormulariosAdminService(session).listar_eventos_envio(f.id, envio_id)
    por_tipo = {e["tipo"]: e for e in eventos}

    assert por_tipo["iniciado"]["actor_nombre"] == "Ana Lopez"
    assert por_tipo["actualizado"]["actor_nombre"] == "Beto Ruiz"
    assert por_tipo["actualizado"]["payload"]["campos"] == ["general.razon_social"]


def test_dos_dependencias_llenan_el_mismo_formulario_por_separado(
    session, client, admin, ana, beto, carla
):
    """El mismo formulario, un envio por grupo: IIEG por su lado, SIAPA por el suyo."""
    f = crear_formulario(session, admin, slug="politicas", colaborativo=True)
    iieg = crear_grupo(session, "iieg", [ana, beto])
    siapa = crear_grupo(session, "siapa", [carla])
    asignar_grupo(session, f, iieg)
    asignar_grupo(session, f, siapa)

    csrf = login(client, ana)
    envio_iieg = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    patch_campos(client, csrf, f.slug, {"general.razon_social": "IIEG"})

    csrf = login(client, carla)
    envio_siapa = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    patch_campos(client, csrf, f.slug, {"general.razon_social": "SIAPA"})

    assert envio_iieg["id"] != envio_siapa["id"]
    assert envio_iieg["grupo_id"] == iieg.id
    assert envio_siapa["grupo_id"] == siapa.id

    login(client, beto)
    visto_por_beto = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    assert visto_por_beto["id"] == envio_iieg["id"]
    assert visto_por_beto["datos"]["general"]["razon_social"] == "IIEG"

    login(client, carla)
    visto_por_carla = client.get(f"{ADMIN_PREFIX}/formularios/{f.slug}/envio").json()
    assert visto_por_carla["datos"]["general"]["razon_social"] == "SIAPA"


def test_cada_grupo_tiene_su_propio_coordinador_en_el_mismo_formulario(
    session, client, admin, ana, beto, carla
):
    f = crear_formulario(session, admin, slug="politicas-2", colaborativo=True)
    iieg = crear_grupo(session, "iieg-2", [ana, beto])
    siapa = crear_grupo(session, "siapa-2", [carla])
    asignar_grupo(session, f, iieg)
    asignar_grupo(session, f, siapa)
    for grupo, usuario in ((iieg, ana), (siapa, carla)):
        session.execute(
            usuario_grupo.update()
            .where(
                usuario_grupo.c.grupo_id == grupo.id,
                usuario_grupo.c.usuario_id == usuario.id,
            )
            .values(rol="coordinador")
        )
    session.commit()

    login(client, ana)
    assert client.get(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio"
    ).json()["puede_enviar"] is True

    login(client, beto)
    assert client.get(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio"
    ).json()["puede_enviar"] is False

    login(client, carla)
    assert client.get(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio"
    ).json()["puede_enviar"] is True


def test_el_admin_prende_la_bandera_desde_el_cms(session, client, admin, ana, beto):
    f = crear_formulario(session, admin, slug="cms-1", colaborativo=False)
    asignar_grupo(session, f, crear_grupo(session, "dep-cms-1", [ana, beto]))

    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={"colaborativo": True},
    )
    assert r.status_code == 200, r.text
    assert r.json()["colaborativo"] is True

    login(client, ana)
    assert client.get(
        f"{ADMIN_PREFIX}/formularios/{f.slug}/envio"
    ).json()["colaborativo"] is True


def test_apagar_la_bandera_con_envios_de_grupo_vivos_es_409(
    session, client, admin, ana, beto
):
    f, _ = envio_colaborativo(session, admin, ana, beto, "cms-2", "dep-cms-2")

    csrf = login(client, ana)
    patch_campos(client, csrf, f.slug, {"general.razon_social": "Acme SA"})

    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/formularios/{f.id}",
        headers={"X-CSRF-Token": csrf},
        json={"colaborativo": False},
    )
    assert r.status_code == 409
    assert "sin acceso" in r.json()["detail"]

    session.expire_all()
    assert session.query(Formulario).filter(Formulario.id == f.id).one().colaborativo


def test_el_admin_nombra_coordinadores_desde_el_cms(session, client, admin, ana, beto):
    grupo = crear_grupo(session, "dep-cms-3", [ana, beto])

    csrf = login(client, admin)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/grupos/{grupo.id}/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={"usuarios": [ana.id, beto.id], "coordinadores": [ana.id]},
    )
    assert r.status_code == 200, r.text

    miembros = client.get(
        f"{ADMIN_PREFIX}/sieej/grupos/{grupo.id}/usuarios"
    ).json()
    por_id = {m["id"]: m["rol_grupo"] for m in miembros}
    assert por_id == {ana.id: "coordinador", beto.id: "capturista"}


def test_quitar_el_coordinador_lo_regresa_a_capturista(
    session, client, admin, ana, beto
):
    grupo = crear_grupo(session, "dep-cms-4", [ana, beto])
    csrf = login(client, admin)
    client.put(
        f"{ADMIN_PREFIX}/sieej/grupos/{grupo.id}/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={"usuarios": [ana.id, beto.id], "coordinadores": [ana.id]},
    )

    client.put(
        f"{ADMIN_PREFIX}/sieej/grupos/{grupo.id}/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={"usuarios": [ana.id, beto.id], "coordinadores": [beto.id]},
    )

    miembros = client.get(
        f"{ADMIN_PREFIX}/sieej/grupos/{grupo.id}/usuarios"
    ).json()
    por_id = {m["id"]: m["rol_grupo"] for m in miembros}
    assert por_id == {ana.id: "capturista", beto.id: "coordinador"}


def test_sacar_del_grupo_a_alguien_no_toca_el_rol_de_los_demas(
    session, client, admin, ana, beto, carla
):
    grupo = crear_grupo(session, "dep-cms-5", [ana, beto, carla])
    csrf = login(client, admin)
    client.put(
        f"{ADMIN_PREFIX}/sieej/grupos/{grupo.id}/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={"usuarios": [ana.id, beto.id, carla.id], "coordinadores": [ana.id]},
    )

    client.put(
        f"{ADMIN_PREFIX}/sieej/grupos/{grupo.id}/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={"usuarios": [ana.id, beto.id], "coordinadores": [ana.id]},
    )

    miembros = client.get(
        f"{ADMIN_PREFIX}/sieej/grupos/{grupo.id}/usuarios"
    ).json()
    assert {m["id"]: m["rol_grupo"] for m in miembros} == {
        ana.id: "coordinador", beto.id: "capturista",
    }
