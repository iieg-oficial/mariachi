import hashlib
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.api.routes import roadmap_lectura

CLAVE = "clave-de-intranet"


class _Consulta:
    def __init__(self, filas):
        self._filas = filas

    def order_by(self, *_):
        return self

    def all(self):
        return self._filas


class _Sesion:
    def query(self, modelo):
        if modelo.__name__ == "RoadmapHito":
            return _Consulta(
                [
                    SimpleNamespace(
                        id=1,
                        clave="intranet-1",
                        etiqueta="intranet 1",
                        proyecto="intranet",
                        tipo="porllegar",
                        fecha_eje="2026-12-15",
                        fecha_texto="mediados de dic 2026",
                        motivo="Releva al legado",
                        nombre_anterior=None,
                        feature_de=None,
                        nace_de=None,
                        leyenda=None,
                        beta=False,
                        muerto=False,
                        orden=0,
                    )
                ]
            )
        return _Consulta([])


@pytest.fixture
def cliente(monkeypatch):
    huella = hashlib.sha256(CLAVE.encode()).hexdigest()
    monkeypatch.setattr(
        roadmap_lectura, "get_settings", lambda: SimpleNamespace(roadmap_api_key_sha256=huella)
    )
    app = FastAPI()
    app.include_router(roadmap_lectura.router)
    app.dependency_overrides[get_db] = lambda: _Sesion()
    return TestClient(app)


def test_con_la_clave_devuelve_hitos_ciclos_y_procesos(cliente):
    respuesta = cliente.get("/roadmap", headers={"X-API-Key": CLAVE})
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert [h["clave"] for h in cuerpo["hitos"]] == ["intranet-1"]
    assert cuerpo["ciclos"] == [] and cuerpo["procesos"] == []


@pytest.mark.parametrize("cabeceras", [{}, {"X-API-Key": "otra"}])
def test_sin_la_clave_es_401(cliente, cabeceras):
    assert cliente.get("/roadmap", headers=cabeceras).status_code == 401


def test_sin_huella_configurada_esta_apagado(monkeypatch):
    monkeypatch.setattr(
        roadmap_lectura, "get_settings", lambda: SimpleNamespace(roadmap_api_key_sha256=None)
    )
    app = FastAPI()
    app.include_router(roadmap_lectura.router)
    app.dependency_overrides[get_db] = lambda: _Sesion()
    assert TestClient(app).get("/roadmap", headers={"X-API-Key": CLAVE}).status_code == 401


def test_solo_existe_la_lectura(cliente):
    assert cliente.post("/roadmap", headers={"X-API-Key": CLAVE}, json={}).status_code == 405
