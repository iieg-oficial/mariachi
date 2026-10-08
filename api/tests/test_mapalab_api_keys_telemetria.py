from datetime import date, datetime, timedelta
from types import SimpleNamespace

import pytest

from app.api.routes import mapalab_api_keys_internal
from app.models.mapalab_api_key import MapalabApiKey
from app.models.mapalab_api_key_acceso import MapalabApiKeyAcceso
from app.models.mapalab_api_key_rendimiento import (
    MapalabApiKeyRendimientoDiario,
    MapalabApiKeySitioDiario,
)
from app.models.mapalab_api_key_uso import MapalabApiKeyUsoDiario
from app.services.mapalab_keys_telemetria import purgar_diarios
from tests.conftest import ADMIN_PREFIX

INTERNO = f"{ADMIN_PREFIX}/internal/mapalab/keys"
ADMIN = f"{ADMIN_PREFIX}/mapalab/api-keys"
TOKEN = {"X-Internal-Token": "secreto"}


@pytest.fixture
def token_interno(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        mapalab_api_keys_internal,
        "get_settings",
        lambda: SimpleNamespace(mapalab_internal_token="secreto"),
    )


@pytest.fixture
def llave(db_session) -> MapalabApiKey:
    api_key = MapalabApiKey(
        institucion_nombre="Secretaría de Salud",
        visibility="public",
        key_prefix="mk_pub_ab12",
        key_hash="hash",
        dominios_permitidos=["https://salud.jalisco.gob.mx"],
        ips_permitidas=[],
        capas_permitidas=[],
        estado="active",
    )
    db_session.add(api_key)
    db_session.commit()
    db_session.refresh(api_key)
    return api_key


def _vital(key_id: int, **extra: object) -> dict:
    base = {
        "keyId": key_id,
        "dia": "2026-10-01",
        "origen": "https://salud.jalisco.gob.mx",
        "metrica": "LCP",
        "muestras": 2,
        "suma": 3.5,
        "buenas": 1,
        "regulares": 1,
        "malas": 0,
    }
    return {**base, **extra}


def _sitio(key_id: int, **extra: object) -> dict:
    base = {
        "keyId": key_id,
        "dia": "2026-10-01",
        "origen": "https://salud.jalisco.gob.mx",
        "cargas": 3,
        "listos": 2,
        "erroresJs": 1,
        "denegados": 0,
        "timeouts": 1,
    }
    return {**base, **extra}


def test_rendimiento_suma_sobre_la_misma_llave(client, db_session, llave, token_interno) -> None:
    items = [_vital(llave.id), _vital(llave.id), _vital(llave.id, metrica="INP", muestras=1, suma=150.0)]
    res = client.post(f"{INTERNO}/rendimiento", json={"items": items}, headers=TOKEN)
    assert res.status_code == 200
    assert res.json() == {"ok": True, "upserts": 3}

    res = client.post(f"{INTERNO}/rendimiento", json={"items": [_vital(llave.id, origen="")]}, headers=TOKEN)
    assert res.json()["upserts"] == 1

    filas = {
        (f.origen, f.metrica): f
        for f in db_session.query(MapalabApiKeyRendimientoDiario).all()
    }
    lcp = filas[("https://salud.jalisco.gob.mx", "LCP")]
    assert (lcp.muestras, lcp.suma, lcp.buenas, lcp.regulares, lcp.malas) == (4, 7.0, 2, 2, 0)
    assert filas[("https://salud.jalisco.gob.mx", "INP")].muestras == 1
    assert filas[("", "LCP")].muestras == 2


def test_rendimiento_ignora_llave_inexistente_y_dia_invalido(client, llave, token_interno) -> None:
    items = [_vital(llave.id + 99), _vital(llave.id, dia="ayer"), _vital(llave.id)]
    res = client.post(f"{INTERNO}/rendimiento", json={"items": items}, headers=TOKEN)
    assert res.json() == {"ok": True, "upserts": 1}


def test_rendimiento_exige_token(client, llave, token_interno) -> None:
    res = client.post(f"{INTERNO}/rendimiento", json={"items": [_vital(llave.id)]})
    assert res.status_code == 401


def test_sitios_suma_sobre_la_misma_llave(client, db_session, llave, token_interno) -> None:
    items = [_sitio(llave.id), _sitio(llave.id), _sitio(llave.id + 99), _sitio(llave.id, dia="2026-13-40")]
    res = client.post(f"{INTERNO}/sitios", json={"items": items}, headers=TOKEN)
    assert res.json() == {"ok": True, "upserts": 2}

    fila = db_session.query(MapalabApiKeySitioDiario).one()
    assert (fila.cargas, fila.listos, fila.errores_js, fila.denegados, fila.timeouts) == (6, 4, 2, 0, 2)


def test_accesos_sin_llave_guardan_el_prefijo(client, db_session, llave, token_interno, admin_session) -> None:
    ahora = datetime(2026, 10, 1, 12, 0, 0).isoformat()
    items = [
        {
            "apiKeyId": None,
            "keyPrefix": "mk_pub_ab12",
            "timestamp": ahora,
            "endpoint": "config",
            "resultado": "denied",
            "motivo": "invalid_key",
        },
        {
            "apiKeyId": llave.id,
            "keyPrefix": "mk_pub_ab12",
            "timestamp": ahora,
            "endpoint": "config",
            "resultado": "allowed",
        },
        {"apiKeyId": llave.id + 99, "timestamp": ahora, "endpoint": "config", "resultado": "allowed"},
        {"apiKeyId": None, "keyPrefix": "mk_pub_zz99", "timestamp": ahora, "endpoint": "tree", "resultado": "denied"},
    ]
    res = client.post(f"{INTERNO}/accesos", json={"items": items}, headers=TOKEN)
    assert res.json() == {"ok": True, "inserts": 3}

    huerfana = db_session.query(MapalabApiKeyAcceso).filter(MapalabApiKeyAcceso.motivo == "invalid_key").one()
    assert huerfana.api_key_id is None
    assert huerfana.key_prefix == "mk_pub_ab12"

    res = client.get(f"{ADMIN}/{llave.id}/accesos")
    assert res.status_code == 200
    cuerpo = res.json()
    assert cuerpo["total"] == 2
    assert {item["keyPrefix"] for item in cuerpo["items"]} == {"mk_pub_ab12"}
    assert {item["motivo"] for item in cuerpo["items"]} == {"invalid_key", None}

    res = client.get(f"{ADMIN}/{llave.id}/accesos", params={"resultado": "denied"})
    assert res.json()["total"] == 1


def test_get_rendimiento_y_sitios_por_rango(client, db_session, llave, admin_session) -> None:
    hoy = date.today()
    for dias_atras in (0, 10, 40):
        dia = hoy - timedelta(days=dias_atras)
        db_session.add(MapalabApiKeyRendimientoDiario(
            api_key_id=llave.id, dia=dia, origen="", metrica="LCP",
            muestras=1, suma=1.0, buenas=1, regulares=0, malas=0,
        ))
        db_session.add(MapalabApiKeySitioDiario(
            api_key_id=llave.id, dia=dia, origen="", cargas=1, listos=1,
            errores_js=0, denegados=0, timeouts=0,
        ))
    db_session.commit()

    res = client.get(f"{ADMIN}/{llave.id}/rendimiento")
    assert res.status_code == 200
    assert len(res.json()) == 2
    assert set(res.json()[0].keys()) >= {"apiKeyId", "dia", "metrica", "buenas", "regulares", "malas"}

    desde = (hoy - timedelta(days=45)).isoformat()
    hasta = (hoy - timedelta(days=5)).isoformat()
    res = client.get(f"{ADMIN}/{llave.id}/sitios", params={"desde": desde, "hasta": hasta})
    assert [fila["dia"] for fila in res.json()] == [
        (hoy - timedelta(days=40)).isoformat(),
        (hoy - timedelta(days=10)).isoformat(),
    ]
    assert "erroresJs" in res.json()[0]

    res = client.get(f"{ADMIN}/{llave.id}/sitios", params={"desde": hasta, "hasta": desde})
    assert res.status_code == 400
    assert client.get(f"{ADMIN}/{llave.id + 99}/rendimiento").status_code == 404


def test_purga_borra_los_diarios_viejos(db_session, llave) -> None:
    hoy = date(2026, 10, 5)
    for dia in (hoy - timedelta(days=400), hoy - timedelta(days=10)):
        db_session.add(MapalabApiKeyUsoDiario(api_key_id=llave.id, dia=dia, requests=1, errores=0, bytes_out=0))
        db_session.add(MapalabApiKeyRendimientoDiario(
            api_key_id=llave.id, dia=dia, origen="", metrica="LCP",
            muestras=1, suma=1.0, buenas=1, regulares=0, malas=0,
        ))
        db_session.add(MapalabApiKeySitioDiario(
            api_key_id=llave.id, dia=dia, origen="", cargas=1, listos=1,
            errores_js=0, denegados=0, timeouts=0,
        ))
    db_session.commit()

    borrados = purgar_diarios(db_session, hoy, 365)

    assert borrados == {
        "mapalab_api_keys_uso_diario": 1,
        "mapalab_api_keys_rendimiento_diario": 1,
        "mapalab_api_keys_sitios_diario": 1,
    }
    assert db_session.query(MapalabApiKeyUsoDiario).count() == 1
    assert db_session.query(MapalabApiKeyRendimientoDiario).count() == 1
    assert db_session.query(MapalabApiKeySitioDiario).count() == 1
