import hashlib
from datetime import date
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import intranet_cliente
from app.api.routes import intranet_inhabiles_lectura
from app.services.vine_perfiles import festivos, festivos_con_motivo

CLAVE = "clave-de-intranet"


@pytest.fixture
def cliente(monkeypatch):
    huella = hashlib.sha256(CLAVE.encode()).hexdigest()
    monkeypatch.setattr(
        intranet_cliente, "get_settings", lambda: SimpleNamespace(intranet_cliente_sha256=huella)
    )
    app = FastAPI()
    app.include_router(intranet_inhabiles_lectura.router)
    return TestClient(app)


def test_devuelve_los_dias_del_anio_con_su_motivo(cliente):
    respuesta = cliente.get("/intranet/inhabiles?anio=2026", headers={"X-API-Key": CLAVE})
    assert respuesta.status_code == 200
    dias = {d["fecha"]: d["motivo"] for d in respuesta.json()["dias"]}
    assert dias["2026-01-01"] == "Año Nuevo"
    assert dias["2026-06-11"] == "Mundial en Guadalajara"
    assert dias["2026-09-28"] == "Día del Servidor Público"
    assert list(dias) == sorted(dias)


def test_el_servidor_publico_se_recorre_al_habil():
    motivos = dict(festivos_con_motivo(date(2027, 1, 1), date(2027, 12, 31)))
    assert motivos[date(2027, 9, 28)] == "Día del Servidor Público"
    motivos = dict(festivos_con_motivo(date(2025, 1, 1), date(2025, 12, 31)))
    assert motivos[date(2025, 9, 29)] == "Día del Servidor Público"


def test_festivos_sigue_devolviendo_solo_fechas():
    dias = festivos(date(2026, 1, 1), date(2026, 12, 31))
    assert date(2026, 11, 16) in dias
    assert all(isinstance(d, date) for d in dias)


@pytest.mark.parametrize("cabeceras", [{}, {"X-API-Key": "otra"}])
def test_sin_la_clave_es_401(cliente, cabeceras):
    assert cliente.get("/intranet/inhabiles?anio=2026", headers=cabeceras).status_code == 401
