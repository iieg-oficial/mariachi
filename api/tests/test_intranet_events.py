import hashlib
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.dialects import postgresql

from app.api import intranet_cliente
from app.api.deps import get_db
from app.api.routes import intranet_events_public
from app.schemas.intranet_event import IntranetEventBatchIn, IntranetEventIn
from app.services import mapalab_telemetry

CLAVE = "clave-de-intranet"


@pytest.fixture
def cliente(monkeypatch):
    llamadas = []

    def ingerir(db, payload, *, user_agent, app):
        llamadas.append((payload, app))
        return len(payload.events)

    huella = hashlib.sha256(CLAVE.encode()).hexdigest()
    monkeypatch.setattr(
        intranet_cliente, "get_settings", lambda: SimpleNamespace(intranet_cliente_sha256=huella)
    )
    monkeypatch.setattr(intranet_events_public, "ingest_batch", ingerir)
    app = FastAPI()
    app.include_router(intranet_events_public.router)
    app.dependency_overrides[get_db] = lambda: None
    return TestClient(app), llamadas


def _lote(*nombres):
    return {
        "sessionId": str(uuid4()),
        "pathname": "/documentos",
        "events": [{"eventName": nombre, "props": {"ruta": "/"}} for nombre in nombres],
    }


def test_el_lote_se_guarda_como_app_intranet(cliente):
    http, llamadas = cliente
    respuesta = http.post(
        "/intranet/events/batch",
        headers={"X-API-Key": CLAVE},
        json=_lote("session_start", "page_view", "documento_descargar"),
    )
    assert respuesta.status_code == 202
    assert respuesta.json() == {"ok": True, "inserted": 3}
    payload, app = llamadas[0]
    assert app == "intranet"
    assert payload.source == "pagina"


def test_eventos_de_mapalab_no_entran_por_aqui(cliente):
    http, llamadas = cliente
    respuesta = http.post(
        "/intranet/events/batch", headers={"X-API-Key": CLAVE}, json=_lote("layer_toggle")
    )
    assert respuesta.status_code == 422
    assert llamadas == []


@pytest.mark.parametrize("cabeceras", [{}, {"X-API-Key": "otra"}])
def test_sin_la_clave_de_intranet_es_401(cliente, cabeceras):
    http, llamadas = cliente
    respuesta = http.post("/intranet/events/batch", headers=cabeceras, json=_lote("page_view"))
    assert respuesta.status_code == 401
    assert llamadas == []


def test_si_falla_la_persistencia_responde_500(cliente, monkeypatch):
    http, _ = cliente

    def falla(db, payload, *, user_agent, app):
        raise RuntimeError("base caida")

    monkeypatch.setattr(intranet_events_public, "ingest_batch", falla)
    respuesta = http.post(
        "/intranet/events/batch", headers={"X-API-Key": CLAVE}, json=_lote("page_view")
    )
    assert respuesta.status_code == 500
    assert respuesta.json() == {"detail": "No se pudo persistir el lote"}


@pytest.mark.parametrize("desfase", [timedelta(days=2), timedelta(days=-2), timedelta(days=400)])
def test_ts_fuera_de_un_dia_se_recorta_a_ahora(desfase):
    antes = datetime.now(UTC)
    evento = IntranetEventIn(eventName="page_view", ts=antes + desfase)
    assert abs(evento.ts - antes) < timedelta(minutes=1)


@pytest.mark.parametrize("desfase", [timedelta(hours=23), timedelta(hours=-23)])
def test_ts_dentro_de_un_dia_se_respeta(desfase):
    ts = datetime.now(UTC) + desfase
    assert IntranetEventIn(eventName="page_view", ts=ts).ts == ts


def test_ts_sin_zona_tambien_se_acota():
    viejo = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=3)
    evento = IntranetEventIn(eventName="page_view", ts=viejo)
    assert abs(evento.ts - datetime.now(UTC)) < timedelta(minutes=1)


def test_el_upsert_de_sesion_no_mezcla_apps():
    sentencias = []

    class Sesion:
        def bulk_insert_mappings(self, modelo, filas):
            pass

        def execute(self, sentencia):
            sentencias.append(sentencia)

        def commit(self):
            pass

    payload = IntranetEventBatchIn.model_validate(_lote("page_view"))
    mapalab_telemetry.ingest_batch(Sesion(), payload, user_agent=None, app="intranet")
    sql = str(sentencias[0].compile(dialect=postgresql.dialect()))
    assert "ON CONFLICT (session_id) DO UPDATE" in sql
    assert "WHERE huachicol.sessions.app = excluded.app" in sql


@pytest.mark.parametrize(
    "nombre",
    [
        "galeria_orden",
        "galeria_reaccion",
        "galeria_comentario",
        "galeria_subir",
        "galeria_editar",
        "galeria_borrar",
        "proyecto_detalle",
        "proyectos_plegar",
        "roadmap_pantalla",
        "seccion_ir",
        "seccion_buscar",
        "cuenta_solicitar",
        "carpeta_abrir",
        "album_abrir",
        "album_crear",
    ],
)
def test_acepta_los_eventos_nuevos_de_la_portada(nombre):
    assert IntranetEventIn(event_name=nombre).event_name == nombre
