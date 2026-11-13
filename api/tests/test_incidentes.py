import time

import pytest

from app.services import incidentes
from tests.conftest import ADMIN_PREFIX


class _StreamDeMemoria:
    def __init__(self):
        self.entradas: list[tuple[str, dict[str, str]]] = []

    def agregar(self, ts_ms: int, **campos: str) -> None:
        self.entradas.append((f'{ts_ms}-0', campos))

    def xrevrange(self, stream, max='+', min='-', count=None):
        desde = int(min)
        filtradas = [e for e in self.entradas if int(e[0].split('-')[0]) >= desde]
        return list(reversed(filtradas))[:count]


@pytest.fixture
def stream(monkeypatch):
    fake = _StreamDeMemoria()
    monkeypatch.setattr(incidentes, 'redis_client', fake)
    return fake


def test_resumen_agrupa_por_actor_scope_y_ruta(stream):
    ahora = int(time.time() * 1000)
    base = {
        'tipo': 'usuario', 'scope': 'grid_write', 'actor': 'alguien', 'metodo': 'PUT', 'ruta': '/grid/{id}',
        'limite': '60', 'ventana_s': '60',
    }
    for i, golpes in enumerate((61, 62, 63)):
        stream.agregar(ahora - i * 1000, **base, golpes=str(golpes))
    stream.agregar(ahora - 5000, tipo='ip', scope='refresh', actor='ip:abc', metodo='POST', ruta='/r', golpes='31')
    stream.agregar(ahora - 3 * 3600 * 1000, **base, golpes='99')

    r = incidentes.resumen(60)

    assert r['total'] == 4
    assert r['grupos'][0]['actor'] == 'alguien'
    assert r['grupos'][0]['golpes'] == 3
    assert r['grupos'][0]['pico'] == 63
    assert r['grupos'][0]['limite'] == 60
    assert r['grupos'][0]['duracion_s'] == 2
    assert sum(p['golpes'] for p in r['grupos'][0]['serie']) == 3
    assert sum(p['golpes'] for p in r['serie']) == 4


def test_resumen_acota_la_ventana(stream):
    assert incidentes.resumen(10 ** 6)['ventana_minutos'] == incidentes.VENTANA_MAX_MINUTOS
    assert incidentes.resumen(0)['ventana_minutos'] == 1


def test_huella_ip_es_estable_y_no_expone_la_ip():
    h = incidentes.huella_ip('10.1.2.3')
    assert h == incidentes.huella_ip('10.1.2.3')
    assert h != incidentes.huella_ip('10.1.2.4')
    assert '10.1.2.3' not in h


def test_incidentes_requiere_auth(client):
    assert client.get(f'{ADMIN_PREFIX}/incidentes').status_code == 401


def test_incidentes_niega_sin_permiso(editora_session):
    assert editora_session['client'].get(f'{ADMIN_PREFIX}/incidentes').status_code == 403


def test_incidentes_permite_con_permiso(admin_session, stream):
    r = admin_session['client'].get(f'{ADMIN_PREFIX}/incidentes?minutos=15')
    assert r.status_code == 200
    assert r.headers['cache-control'] == 'no-store'
    assert r.json()['ventana_minutos'] == 15
    scopes = {t['scope'] for t in r.json()['topes']}
    assert {'geoserver_upload', 'geoserver_write', 'grid_write'} <= scopes


def test_incidentes_valida_la_ventana(admin_session, stream):
    r = admin_session['client'].get(f'{ADMIN_PREFIX}/incidentes?minutos=99999')
    assert r.status_code == 422
