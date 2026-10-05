import hashlib
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import intranet_cliente
from app.api.deps import verify_csrf
from app.api.routes import instituto_espacios as rutas
from app.core.database import get_dataengine_db
from app.services import instituto_espacios as servicio

CLAVE = "clave-de-intranet"
PLANO = {"pisos": [{"id": 1, "nombre": "Planta baja", "ancho": 130.7, "alto": 39.9, "espacios": []}]}
USUARIO = SimpleNamespace(name="Ana López", username="ana")


@pytest.fixture
def llamadas(monkeypatch):
    registro = {}
    huella = hashlib.sha256(CLAVE.encode()).hexdigest()
    monkeypatch.setattr(
        intranet_cliente, "get_settings", lambda: SimpleNamespace(intranet_cliente_sha256=huella)
    )
    monkeypatch.setattr(servicio, "plano", lambda db: PLANO)

    def editar(db, fid, cambios, actor):
        registro["editar"] = (fid, cambios, actor)
        return {"fid": fid, **cambios}

    def restaurar(db, fid, historial_id, actor):
        registro["restaurar"] = (fid, historial_id, actor)
        return {"fid": fid}

    monkeypatch.setattr(servicio, "editar", editar)
    monkeypatch.setattr(servicio, "restaurar", restaurar)
    return registro


@pytest.fixture
def cliente(llamadas):
    app = FastAPI()
    app.include_router(rutas.router)
    app.include_router(rutas.lectura_router, prefix="/publico")
    app.dependency_overrides[get_dataengine_db] = lambda: None
    app.dependency_overrides[verify_csrf] = lambda: USUARIO
    app.dependency_overrides[rutas._gestionar] = lambda: USUARIO
    return TestClient(app)


def test_la_intranet_lee_el_plano_solo_con_su_clave(cliente):
    assert cliente.get("/publico/intranet/espacios", headers={"X-API-Key": CLAVE}).json() == PLANO
    assert cliente.get("/publico/intranet/espacios").status_code == 401


def test_editar_manda_solo_lo_que_cambia_y_quien_lo_cambio(cliente, llamadas):
    respuesta = cliente.put("/intranet/espacios/7", json={"nombre": "Auditorio", "incluir": False})
    assert respuesta.status_code == 200
    assert llamadas["editar"] == (7, {"nombre": "Auditorio", "incluir": False}, "Ana López")


def test_editar_rechaza_un_tipo_que_no_existe(cliente, llamadas):
    assert cliente.put("/intranet/espacios/7", json={"tipo": "bodega"}).status_code == 422
    assert "editar" not in llamadas


def test_restaurar_una_version(cliente, llamadas):
    assert cliente.post("/intranet/espacios/7/historial/3/restaurar").status_code == 200
    assert llamadas["restaurar"] == (7, 3, "Ana López")


def test_el_servicio_firma_el_cambio_y_solo_toca_campos_editables(monkeypatch):
    db = MagicMock()
    db.execute.return_value.rowcount = 1
    monkeypatch.setattr(servicio, "obtener", lambda db, fid: {"fid": fid})
    servicio.editar(db, 7, {"nombre": "Auditorio", "geom": "x", "aproximado": True}, "Ana López")
    sentencias = [str(llamada.args[0]) for llamada in db.execute.call_args_list]
    assert any("instituto.actor" in s for s in sentencias)
    assert any("instituto.origen" in s for s in sentencias)
    actualizacion = next(s for s in sentencias if s.startswith("UPDATE"))
    assert "nombre = :nombre" in actualizacion
    assert "geom" not in actualizacion and "aproximado" not in actualizacion
    db.commit.assert_called_once()
