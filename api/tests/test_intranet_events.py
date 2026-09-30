import hashlib
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import intranet_cliente
from app.api.deps import get_db
from app.api.routes import intranet_events_public

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
