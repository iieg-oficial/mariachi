import hashlib
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import intranet_cliente
from app.api.routes import intranet_directorio_lectura
from app.core.database import get_db

CLAVE = "clave-de-intranet"
PERSONA = {
    "id": "7",
    "nombre_completo": "Ana López",
    "puesto": "Analista",
    "area": "Dirección de Sistemas",
    "email": "ana@iieg.gob.mx",
    "extension": "36700",
    "foto_url": None,
}


@pytest.fixture
def cliente(monkeypatch):
    huella = hashlib.sha256(CLAVE.encode()).hexdigest()
    monkeypatch.setattr(
        intranet_cliente, "get_settings", lambda: SimpleNamespace(intranet_cliente_sha256=huella)
    )
    monkeypatch.setattr(intranet_directorio_lectura, "directorio", lambda db: [PERSONA])
    app = FastAPI()
    app.include_router(intranet_directorio_lectura.router)
    app.dependency_overrides[get_db] = lambda: None
    return TestClient(app)


def test_entrega_el_directorio_con_la_clave_de_intranet(cliente):
    respuesta = cliente.get("/intranet/directorio", headers={"X-API-Key": CLAVE})
    assert respuesta.status_code == 200
    assert respuesta.json() == {"personas": [PERSONA]}


def test_sin_clave_no_entrega_nada(cliente):
    assert cliente.get("/intranet/directorio").status_code == 401
    assert cliente.get("/intranet/directorio", headers={"X-API-Key": "otra"}).status_code == 401
