import hashlib
from types import SimpleNamespace

import pytest

from app.api.routes import sieej_documentacion_publico
from app.core.settings import get_settings
from app.models.sieej_documentacion import PipelineDoc, SincronizacionDoc
from tests.conftest import ADMIN_PREFIX, login_as

CLAVE = "clave-del-sincronizador"
PUBLICO = get_settings().public_prefix
DOC = f"{ADMIN_PREFIX}/sieej-documentacion"
README = {
    "descripcion": ["Pipeline ETL de la **EMEC**."],
    "avisos": ["Todo son índices."],
    "caracteristicas": [{"etiqueta": "Frecuencia", "valor": "Mensual"}],
    "fuente_general": "https://www.inegi.org.mx/programas/emec/",
    "descargas": [],
    "variables": [{"etiqueta": "EMEC_URL", "valor": "URL del ZIP"}],
}
BASE = {"nombre": "emec", "tablas": [{"nombre": "stg_emec", "filas": 10}], "relaciones": [], "vistas": []}


@pytest.fixture(autouse=True)
def clave_de_servicio(monkeypatch):
    huella = hashlib.sha256(CLAVE.encode()).hexdigest()
    monkeypatch.setattr(
        sieej_documentacion_publico,
        "get_settings",
        lambda: SimpleNamespace(sieej_documentacion_sync_sha256=huella),
    )


def _sync(client, pipelines, fuentes=None, clave=CLAVE):
    return client.put(
        f"{PUBLICO}/sieej-documentacion/sync",
        json={
            "iniciado_en": "2026-10-02T03:00:00",
            "version": "datalayer-prueba",
            "fuentes": fuentes or {"bd": {"estado": "ok"}, "readme": {"estado": "ok"}},
            "pipelines": pipelines,
        },
        headers={"X-API-Key": clave},
    )


def _pipeline(clave="emec", readme=README, commit="abc1234"):
    return {
        "clave": clave,
        "carpeta_etl": clave,
        "fuentes_detectadas": ["bd", "readme"],
        "titulo": clave.upper(),
        "producto": "Encuesta Mensual",
        "clasificacion": "documentado",
        "readme": readme,
        "readme_commit": commit,
        "base": BASE,
        "origen_base": "bd",
        "etapas": [{"dag_id": f"etl_{clave}_update", "etapa": "update"}],
    }


def test_sin_la_clave_el_sync_es_401(client):
    assert _sync(client, [_pipeline()], clave="otra").status_code == 401


def test_un_pipeline_nuevo_se_crea_publicado_y_queda_registrado(client, db_session):
    respuesta = _sync(client, [_pipeline(), _pipeline("fosas_clandestinas", readme=None)])
    assert respuesta.status_code == 200
    assert respuesta.json()["nuevos"] == ["emec", "fosas_clandestinas"]
    emec = db_session.query(PipelineDoc).filter_by(clave="emec").one()
    assert emec.estado == "nuevo"
    tipos = [s["tipo"] for s in emec.contenido_publicado["secciones"]]
    assert tipos == ["descripcion", "fuente", "tablas", "vistas", "ejecucion", "variables", "diagrama"]
    fosas = db_session.query(PipelineDoc).filter_by(clave="fosas_clandestinas").one()
    assert [s["tipo"] for s in fosas.contenido_publicado["secciones"]] == [
        "tablas", "vistas", "ejecucion", "diagrama"
    ]
    assert db_session.query(SincronizacionDoc).one().estado == "ok"


def test_el_sync_no_pisa_una_seccion_editada(admin_session, db_session):
    client, csrf = admin_session["client"], admin_session["csrf"]
    _sync(client, [_pipeline()])
    detalle = client.get(f"{DOC}/pipelines/emec").json()
    borrador = detalle["borrador"]
    borrador["secciones"][0]["contenido"]["parrafos"] = ["Texto corregido a mano."]
    guardado = client.put(f"{DOC}/pipelines/emec", json=borrador, headers={"X-CSRF-Token": csrf})
    assert guardado.status_code == 200
    assert guardado.json()["borrador"]["secciones"][0]["editada"] is True

    nuevo = dict(README, descripcion=["Texto nuevo del README."], variables=[])
    _sync(client, [_pipeline(readme=nuevo, commit="def5678")])
    detalle = client.get(f"{DOC}/pipelines/emec").json()
    secciones = {s["tipo"]: s for s in detalle["borrador"]["secciones"]}
    assert secciones["descripcion"]["contenido"]["parrafos"] == ["Texto corregido a mano."]
    assert secciones["variables"]["contenido"]["variables"] == []
    assert detalle["secciones_con_readme_nuevo"] == 1


def test_sin_borrador_pendiente_el_readme_nuevo_se_publica_solo(client, db_session):
    _sync(client, [_pipeline()])
    nuevo = dict(README, descripcion=["Versión 2 del README."])
    _sync(client, [_pipeline(readme=nuevo, commit="def5678")])
    emec = db_session.query(PipelineDoc).filter_by(clave="emec").one()
    db_session.refresh(emec)
    assert emec.contenido_publicado["secciones"][0]["contenido"]["parrafos"] == ["Versión 2 del README."]


def test_solo_se_retira_si_bd_y_readme_respondieron(client, db_session):
    _sync(client, [_pipeline(), _pipeline("denue")])
    _sync(client, [_pipeline()], fuentes={"bd": {"estado": "caida"}, "readme": {"estado": "ok"}})
    assert db_session.query(PipelineDoc).filter_by(clave="denue").one().estado != "retirado"
    respuesta = _sync(client, [_pipeline()])
    assert respuesta.json()["retirados"] == ["denue"]


def test_publicar_exige_su_propio_permiso(client, editora_user, db_session):
    _sync(client, [_pipeline()])
    csrf = login_as(
        client,
        editora_user,
        {"mariachi.sieej_documentacion.view", "mariachi.sieej_documentacion.update"},
    )
    assert client.post(f"{DOC}/pipelines/emec/publicar", headers={"X-CSRF-Token": csrf}).status_code == 403
    csrf = login_as(client, editora_user, {"mariachi.sieej_formularios.update"})
    assert client.get(f"{DOC}/pipelines").status_code == 403


def test_publicar_descartar_y_restablecer(admin_session):
    client, csrf = admin_session["client"], admin_session["csrf"]
    _sync(client, [_pipeline()])
    borrador = client.get(f"{DOC}/pipelines/emec").json()["borrador"]
    borrador["secciones"].append(
        {"id": "nota1", "tipo": "texto", "titulo": "Nota", "contenido": {"markdown": "Hola"}}
    )
    borrador["secciones"][0]["contenido"]["parrafos"] = ["Cambio"]
    client.put(f"{DOC}/pipelines/emec", json=borrador, headers={"X-CSRF-Token": csrf})
    publicado = client.post(f"{DOC}/pipelines/emec/publicar", headers={"X-CSRF-Token": csrf}).json()
    assert publicado["estado"] == "activo"
    assert publicado["publicado"]["secciones"][-1]["tipo"] == "texto"

    seccion_id = publicado["borrador"]["secciones"][0]["id"]
    restablecido = client.post(
        f"{DOC}/pipelines/emec/secciones/{seccion_id}/restablecer", headers={"X-CSRF-Token": csrf}
    ).json()
    assert restablecido["borrador"]["secciones"][0]["contenido"]["parrafos"] == README["descripcion"]
    descartado = client.post(f"{DOC}/pipelines/emec/descartar", headers={"X-CSRF-Token": csrf}).json()
    assert descartado["borrador"]["secciones"][0]["contenido"]["parrafos"] == ["Cambio"]


def test_la_api_publica_respeta_visibilidad(admin_session):
    client, csrf = admin_session["client"], admin_session["csrf"]
    _sync(client, [_pipeline(), _pipeline("denue")])
    borrador = client.get(f"{DOC}/pipelines/emec").json()["borrador"]
    borrador["secciones"][1]["visible"] = False
    client.put(f"{DOC}/pipelines/emec", json=borrador, headers={"X-CSRF-Token": csrf})
    client.post(f"{DOC}/pipelines/emec/publicar", headers={"X-CSRF-Token": csrf})
    client.patch(f"{DOC}/pipelines/denue", json={"visible": False}, headers={"X-CSRF-Token": csrf})

    lista = client.get(f"{PUBLICO}/sieej-documentacion/pipelines").json()
    assert [p["clave"] for p in lista] == ["emec"]
    pagina = client.get(f"{PUBLICO}/sieej-documentacion/pipelines/emec").json()
    assert "fuente" not in [s["tipo"] for s in pagina["secciones"]]
    assert pagina["base"]["tablas"][0]["nombre"] == "stg_emec"
    assert client.get(f"{PUBLICO}/sieej-documentacion/pipelines/denue").status_code == 404


def test_salud_reporta_la_ultima_sincronizacion(client):
    assert client.get(f"{PUBLICO}/sieej-documentacion/salud").json()["estado"] == "sin_sincronizar"
    _sync(client, [_pipeline()])
    salud = client.get(f"{PUBLICO}/sieej-documentacion/salud").json()
    assert salud["estado"] == "ok"
    assert salud["estado_ultima"] == "ok"
