from unittest.mock import MagicMock

import pytest

from app.core.settings import get_settings
from app.models.reporte import Reporte
from app.models.reporte_tipo import ReporteTipo

PUBLIC_PREFIX = get_settings().public_prefix

_BASE_TIPOS = [
    'problema',
    'solicitud',
    'sugerencia',
    'duda',
    'datos_incorrectos',
    'bug',
]


@pytest.fixture(autouse=True)
def _seed_reporte_tipos(db_session):
    for orden, slug in enumerate(_BASE_TIPOS, start=1):
        db_session.add(
            ReporteTipo(slug=slug, label=slug.capitalize(), activo=True, orden=orden)
        )
    db_session.commit()


@pytest.fixture(autouse=True)
def _patch_rate_limit_and_discord(monkeypatch):
    fake_redis = MagicMock()
    pipe = MagicMock()
    pipe.execute.return_value = (0, 1, 1, True)
    fake_redis.pipeline.return_value = pipe
    monkeypatch.setattr('app.api.rate_limit.redis_client', fake_redis)
    monkeypatch.setattr(
        'app.services.discord_notifier.notify_new_reporte',
        lambda reporte: None,
    )


def test_crear_reporte_minimo(client, db_session):
    response = client.post(
        f'{PUBLIC_PREFIX}/reportes',
        data={
            'tipo': 'bug',
            'mensaje': 'Encontré un error',
            'source_app': 'mapalab',
            'source_route': '/mapa',
            'source_context': '{"basemap":"voyager"}',
            'website': '',
        },
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload['id'] > 0

    reporte = db_session.query(Reporte).filter(Reporte.id == payload['id']).first()
    assert reporte is not None
    assert reporte.tipo == 'bug'
    assert reporte.source_app == 'mapalab'
    assert reporte.estado == 'nuevo'
    assert reporte.email_contacto is None
    assert reporte.source_context.get('basemap') == 'voyager'


def test_honeypot_descarta_reporte(client, db_session):
    response = client.post(
        f'{PUBLIC_PREFIX}/reportes',
        data={
            'tipo': 'bug',
            'mensaje': 'spam',
            'source_app': 'mapalab',
            'website': 'http://spammer.example.com',
        },
    )
    assert response.status_code == 201
    assert response.json() == {'id': 0}
    assert db_session.query(Reporte).count() == 0


def test_tipo_invalido_devuelve_422(client):
    response = client.post(
        f'{PUBLIC_PREFIX}/reportes',
        data={
            'tipo': 'invalido',
            'mensaje': 'hola',
            'source_app': 'mapalab',
            'website': '',
        },
    )
    assert response.status_code == 422


def test_mensaje_demasiado_largo_devuelve_422(client):
    response = client.post(
        f'{PUBLIC_PREFIX}/reportes',
        data={
            'tipo': 'bug',
            'mensaje': 'x' * 2001,
            'source_app': 'mapalab',
            'website': '',
        },
    )
    assert response.status_code == 422


def test_email_opcional_se_guarda_si_se_pasa(client, db_session):
    response = client.post(
        f'{PUBLIC_PREFIX}/reportes',
        data={
            'tipo': 'sugerencia',
            'mensaje': 'idea',
            'source_app': 'mapalab',
            'email_contacto': 'reporta@example.com',
            'website': '',
        },
    )
    assert response.status_code == 201
    reporte = db_session.query(Reporte).filter(Reporte.id == response.json()['id']).first()
    assert reporte.email_contacto == 'reporta@example.com'


def test_source_context_invalido_se_normaliza_a_dict(client, db_session):
    response = client.post(
        f'{PUBLIC_PREFIX}/reportes',
        data={
            'tipo': 'duda',
            'mensaje': 'pregunta',
            'source_app': 'mapalab',
            'source_context': 'no-json',
            'website': '',
        },
    )
    assert response.status_code == 201
    reporte = db_session.query(Reporte).filter(Reporte.id == response.json()['id']).first()
    assert reporte.source_context == {}


def test_cors_dinamico_origen_permitido_recibe_acao(client, monkeypatch):
    monkeypatch.setattr(
        'app.api.colibri_cors._allowed_patterns',
        lambda: ['https://tercero.example.com'],
    )
    response = client.post(
        f'{PUBLIC_PREFIX}/reportes',
        data={'tipo': 'bug', 'mensaje': 'hola', 'source_app': 'mapalab', 'website': ''},
        headers={'Origin': 'https://tercero.example.com'},
    )
    assert response.status_code == 201
    assert response.headers.get('access-control-allow-origin') == 'https://tercero.example.com'


def test_cors_dinamico_preflight_permitido(client, monkeypatch):
    monkeypatch.setattr(
        'app.api.colibri_cors._allowed_patterns',
        lambda: ['*.iieg.gob.mx'],
    )
    response = client.options(
        f'{PUBLIC_PREFIX}/reportes',
        headers={
            'Origin': 'https://mapalab.iieg.gob.mx',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'x-colibri-key',
        },
    )
    assert response.status_code == 200
    assert response.headers.get('access-control-allow-origin') == 'https://mapalab.iieg.gob.mx'
    assert 'X-Colibri-Key' in response.headers.get('access-control-allow-headers', '')


def test_cors_dinamico_origen_no_permitido_sin_acao(client, monkeypatch):
    monkeypatch.setattr(
        'app.api.colibri_cors._allowed_patterns',
        lambda: ['https://permitido.example.com'],
    )
    response = client.post(
        f'{PUBLIC_PREFIX}/reportes',
        data={'tipo': 'bug', 'mensaje': 'hola', 'source_app': 'mapalab', 'website': ''},
        headers={'Origin': 'https://otro.example.com'},
    )
    assert response.status_code == 201
    assert response.headers.get('access-control-allow-origin') != 'https://otro.example.com'
