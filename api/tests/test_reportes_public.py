from unittest.mock import MagicMock

import pytest

from app.api.rate_limit import _client_ip
from app.core.settings import get_settings
from app.models.reporte import Reporte
from app.models.reporte_grupo import ReporteGrupo
from app.models.reporte_tipo import ReporteTipo
from app.models.source_app import SourceApp
from app.services.colibri_keys import generate_api_key
from app.services.colibri_router_engine import _build_payload

PUBLIC_PREFIX = get_settings().public_prefix
URL = f'{PUBLIC_PREFIX}/reportes'
PNG = b'\x89PNG\r\n\x1a\n' + b'\x00' * 32

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
def _patch_rate_limit_and_fanout(monkeypatch):
    fake_redis = MagicMock()
    pipe = MagicMock()
    pipe.execute.return_value = (0, 1, 1, True)
    fake_redis.pipeline.return_value = pipe
    monkeypatch.setattr('app.api.rate_limit.redis_client', fake_redis)
    monkeypatch.setattr(
        'app.api.routes.reportes_public.despachar_reporte',
        lambda reporte_id: None,
    )


def _source_app(db_session, visibility: str, dominios: list[str]) -> str:
    plain, prefix, hashed = generate_api_key(visibility)
    db_session.add(
        SourceApp(
            slug='mapalab',
            nombre='MapaLab',
            api_key_hash=hashed,
            api_key_prefix=prefix,
            dominios_permitidos=dominios,
            rate_limit_per_hour=60,
            activo=True,
        )
    )
    db_session.commit()
    return plain


@pytest.fixture
def key_publica(db_session):
    return _source_app(db_session, 'public', ['*'])


def _post(client, key, data, headers=None, files=None):
    body = {'source_app': 'mapalab', 'website': '', **data}
    return client.post(
        URL,
        data=body,
        files=files,
        headers={'X-Colibri-Key': key, **(headers or {})},
    )


def test_crear_reporte_minimo(client, db_session, key_publica):
    response = _post(client, key_publica, {
        'tipo': 'bug',
        'mensaje': 'Encontré un error',
        'source_route': '/mapa',
        'source_context': '{"basemap":"voyager"}',
    })
    assert response.status_code == 201, response.text
    reporte = db_session.query(Reporte).filter(Reporte.id == response.json()['id']).first()
    assert reporte.tipo == 'bug'
    assert reporte.source_app == 'mapalab'
    assert reporte.source_app_id is not None
    assert reporte.estado == 'nuevo'
    assert reporte.email_contacto is None
    assert reporte.source_context.get('basemap') == 'voyager'


def test_sin_key_devuelve_401(client, db_session):
    response = client.post(
        URL,
        data={'tipo': 'bug', 'mensaje': 'spam', 'source_app': 'mapalab', 'website': ''},
    )
    assert response.status_code == 401
    assert db_session.query(Reporte).count() == 0


def test_key_invalida_devuelve_401(client, key_publica):
    response = _post(client, 'ck_pub_inventada1234567890', {'tipo': 'bug', 'mensaje': 'hola'})
    assert response.status_code == 401


def test_key_publica_con_origen_no_permitido_devuelve_403(client, db_session):
    key = _source_app(db_session, 'public', ['https://mapalab.iieg.gob.mx'])
    response = _post(
        client, key, {'tipo': 'bug', 'mensaje': 'hola'},
        headers={'Origin': 'https://clon.example.com'},
    )
    assert response.status_code == 403


def test_key_privada_desde_navegador_devuelve_403(client, db_session):
    key = _source_app(db_session, 'private', [])
    response = _post(
        client, key, {'tipo': 'bug', 'mensaje': 'hola'},
        headers={'Origin': 'https://mapalab.iieg.gob.mx'},
    )
    assert response.status_code == 403


def test_key_privada_desde_servidor_se_acepta(client, db_session):
    key = _source_app(db_session, 'private', [])
    response = _post(client, key, {'tipo': 'bug', 'mensaje': 'desde un cron'})
    assert response.status_code == 201, response.text


def test_honeypot_descarta_reporte(client, db_session, key_publica):
    response = _post(client, key_publica, {
        'tipo': 'bug',
        'mensaje': 'spam',
        'website': 'http://spammer.example.com',
    })
    assert response.status_code == 201
    assert response.json() == {'id': 0}
    assert db_session.query(Reporte).count() == 0


def test_tipo_invalido_devuelve_422(client, key_publica):
    response = _post(client, key_publica, {'tipo': 'invalido', 'mensaje': 'hola'})
    assert response.status_code == 422


def test_mensaje_demasiado_largo_devuelve_422(client, key_publica):
    response = _post(client, key_publica, {'tipo': 'bug', 'mensaje': 'x' * 2001})
    assert response.status_code == 422


def test_email_opcional_se_guarda_si_se_pasa(client, db_session, key_publica):
    response = _post(client, key_publica, {
        'tipo': 'sugerencia',
        'mensaje': 'idea',
        'email_contacto': 'reporta@example.com',
    })
    assert response.status_code == 201
    reporte = db_session.query(Reporte).filter(Reporte.id == response.json()['id']).first()
    assert reporte.email_contacto == 'reporta@example.com'


def test_source_context_invalido_se_normaliza_a_dict(client, db_session, key_publica):
    response = _post(client, key_publica, {
        'tipo': 'duda',
        'mensaje': 'pregunta',
        'source_context': 'no-json',
    })
    assert response.status_code == 201
    reporte = db_session.query(Reporte).filter(Reporte.id == response.json()['id']).first()
    assert reporte.source_context == {}


def test_reportes_iguales_caen_en_el_mismo_grupo(client, db_session, key_publica):
    datos = {'tipo': 'bug', 'mensaje': 'El mapa no carga', 'source_route': '/eventos/42'}
    primero = _post(client, key_publica, datos).json()['id']
    segundo = _post(client, key_publica, {**datos, 'source_route': '/eventos/77'}).json()['id']
    reportes = db_session.query(Reporte).filter(Reporte.id.in_([primero, segundo])).all()
    grupos = {r.grupo_id for r in reportes}
    assert len(grupos) == 1 and None not in grupos
    grupo = db_session.query(ReporteGrupo).filter(ReporteGrupo.id == grupos.pop()).first()
    assert grupo.count == 2
    assert grupo.ultimo_reporte_id == segundo


def test_captura_que_no_es_imagen_devuelve_415(client, db_session, key_publica, monkeypatch):
    monkeypatch.setattr(
        'app.api.routes.reportes_public._resolve_reportes_bucket',
        lambda db: MagicMock(id=1, acervo_bucket='mariachi'),
    )
    response = _post(
        client, key_publica, {'tipo': 'bug', 'mensaje': 'con captura'},
        files={'screenshot': ('falsa.png', b'<script>alert(1)</script>', 'image/png')},
    )
    assert response.status_code == 415


def test_captura_png_real_se_sube_con_el_mime_detectado(client, db_session, key_publica, monkeypatch):
    subido = {}
    fake_client = MagicMock()
    fake_client.bucket_name = 'mariachi'
    fake_client.client.put_object.side_effect = lambda *a, **k: subido.update(k)
    monkeypatch.setattr(
        'app.api.routes.reportes_public._resolve_reportes_bucket',
        lambda db: MagicMock(id=1, acervo_bucket='mariachi'),
    )
    monkeypatch.setattr(
        'app.api.routes.reportes_public.AcervoClient.for_bucket',
        lambda bucket: fake_client,
    )
    response = _post(
        client, key_publica, {'tipo': 'bug', 'mensaje': 'con captura'},
        files={'screenshot': ('captura.jpg', PNG, 'image/jpeg')},
    )
    assert response.status_code == 201, response.text
    assert subido['content_type'] == 'image/png'


def test_ip_del_cliente_sale_de_x_real_ip_y_no_de_x_forwarded_for():
    request = MagicMock()
    request.headers = {'x-forwarded-for': '1.2.3.4, 200.1.1.1', 'x-real-ip': '200.1.1.1'}
    assert _client_ip(request) == '200.1.1.1'


def test_fanout_no_manda_el_correo_a_terceros():
    reporte = MagicMock(email_contacto='persona@example.com', creado_en=None)
    payload = _build_payload(reporte, None)
    assert 'persona@example.com' not in str(payload)
    assert payload['tiene_contacto'] is True


def test_cors_dinamico_origen_permitido_recibe_acao(client, key_publica, monkeypatch):
    monkeypatch.setattr(
        'app.api.colibri_cors._allowed_patterns',
        lambda: ['https://tercero.example.com'],
    )
    response = _post(
        client, key_publica, {'tipo': 'bug', 'mensaje': 'hola'},
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
        URL,
        headers={
            'Origin': 'https://mapalab.iieg.gob.mx',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'x-colibri-key',
        },
    )
    assert response.status_code == 200
    assert response.headers.get('access-control-allow-origin') == 'https://mapalab.iieg.gob.mx'
    assert 'X-Colibri-Key' in response.headers.get('access-control-allow-headers', '')


def test_cors_dinamico_origen_no_permitido_sin_acao(client, key_publica, monkeypatch):
    monkeypatch.setattr(
        'app.api.colibri_cors._allowed_patterns',
        lambda: ['https://permitido.example.com'],
    )
    response = _post(
        client, key_publica, {'tipo': 'bug', 'mensaje': 'hola'},
        headers={'Origin': 'https://otro.example.com'},
    )
    assert response.status_code == 201
    assert response.headers.get('access-control-allow-origin') != 'https://otro.example.com'
