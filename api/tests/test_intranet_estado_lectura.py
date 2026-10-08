import hashlib
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import intranet_cliente
from app.api.routes import intranet_estado_lectura

CLAVE = "clave-de-intranet"


@pytest.fixture
def cliente(monkeypatch):
    huella = hashlib.sha256(CLAVE.encode()).hexdigest()
    monkeypatch.setattr(
        intranet_cliente, "get_settings", lambda: SimpleNamespace(intranet_cliente_sha256=huella)
    )

    async def monitor(path):
        assert path == "/api/status"
        return {
            "services": [
                {
                    "slug": "mapalab",
                    "status": "ok",
                    "latency_ms": 12,
                    "last_checked": "2026-09-30T18:00:00Z",
                    "url": "http://10.0.0.3:8081/interno",
                    "error": "detalle interno",
                }
            ]
        }

    monkeypatch.setattr(intranet_estado_lectura.huachicol_monitor, "consultar", monitor)
    app = FastAPI()
    app.include_router(intranet_estado_lectura.router)
    return TestClient(app)


def test_con_la_clave_devuelve_solo_los_campos_publicos(cliente):
    respuesta = cliente.get("/intranet/estado", headers={"X-API-Key": CLAVE})
    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "services": [
            {
                "slug": "mapalab",
                "status": "ok",
                "latency_ms": 12,
                "last_checked": "2026-09-30T18:00:00Z",
            }
        ]
    }


@pytest.mark.parametrize("cabeceras", [{}, {"X-API-Key": "otra"}])
def test_sin_la_clave_es_401(cliente, cabeceras):
    assert cliente.get("/intranet/estado", headers=cabeceras).status_code == 401
