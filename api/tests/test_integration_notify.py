"""Tests de integracion cruzada mariachi -> mapalab.

Valida que el notifier dispara POST al backend de mapalab con el shape correcto
y respeta el debounce. No requiere mapalab corriendo (usa httpx.MockTransport).
"""
import time
from unittest.mock import patch

import httpx
import pytest


@pytest.fixture(autouse=True)
def reset_notifier_state():
    from app.services import mapalab_notifier
    with mapalab_notifier._lock:
        if mapalab_notifier._pending_timer:
            mapalab_notifier._pending_timer.cancel()
        mapalab_notifier._pending_timer = None
        mapalab_notifier._last_call_at = 0.0
    yield
    with mapalab_notifier._lock:
        if mapalab_notifier._pending_timer:
            mapalab_notifier._pending_timer.cancel()
        mapalab_notifier._pending_timer = None


def _mock_settings_with_url():
    from app.core.settings import get_settings
    s = get_settings()
    original = s.mapalab_backend_url
    s.mapalab_backend_url = 'http://mapalab-test.local'
    return s, original


def test_notifier_skips_when_no_url():
    from app.core.settings import get_settings
    from app.services import mapalab_notifier
    s = get_settings()
    s.mapalab_backend_url = None
    with patch('httpx.Client') as mock_client:
        mapalab_notifier._do_notify()
        mock_client.assert_not_called()


def test_notifier_posts_to_refresh_cache_endpoint():
    from app.services import mapalab_notifier
    s, original = _mock_settings_with_url()
    try:
        called = {'url': None, 'method': None}

        def handler(request):
            called['url'] = str(request.url)
            called['method'] = request.method
            return httpx.Response(200, json={'ok': True})

        transport = httpx.MockTransport(handler)
        real_client = httpx.Client
        with patch('httpx.Client', lambda **kw: real_client(transport=transport, **{k: v for k, v in kw.items() if k != 'transport'})):
            mapalab_notifier._do_notify()

        assert called['method'] == 'POST'
        assert called['url'] == 'http://mapalab-test.local/layers/refresh-cache'
    finally:
        s.mapalab_backend_url = original


def test_notifier_sends_internal_token_header():
    from app.services import mapalab_notifier
    s, original_url = _mock_settings_with_url()
    original_token = s.mapalab_internal_token
    s.mapalab_internal_token = 'test-token-xyz'
    try:
        called = {'headers': None}

        def handler(request):
            called['headers'] = dict(request.headers)
            return httpx.Response(200, json={'ok': True})

        transport = httpx.MockTransport(handler)
        real_client = httpx.Client
        with patch('httpx.Client', lambda **kw: real_client(transport=transport, **{k: v for k, v in kw.items() if k != 'transport'})):
            mapalab_notifier._do_notify()

        assert called['headers'].get('x-internal-token') == 'test-token-xyz'
    finally:
        s.mapalab_backend_url = original_url
        s.mapalab_internal_token = original_token


def test_notifier_retries_on_failure(monkeypatch):
    from app.api import metrics as m
    from app.services import mapalab_notifier
    s, original = _mock_settings_with_url()
    original_backoff = mapalab_notifier._BACKOFF_BASE_SECONDS
    mapalab_notifier._BACKOFF_BASE_SECONDS = 0.01
    monkeypatch.setattr(m, 'redis_client', _RedisDeMemoria())
    try:
        attempts = {'n': 0}

        def handler(request):
            attempts['n'] += 1
            return httpx.Response(500, json={'error': 'boom'})

        transport = httpx.MockTransport(handler)
        real_client = httpx.Client
        with patch('httpx.Client', lambda **kw: real_client(transport=transport, **{k: v for k, v in kw.items() if k != 'transport'})):
            mapalab_notifier._do_notify()

        assert attempts['n'] == mapalab_notifier._MAX_ATTEMPTS
        assert m._leer(m.SENAL_NOTIFY_FALLIDO) == 1
    finally:
        s.mapalab_backend_url = original
        mapalab_notifier._BACKOFF_BASE_SECONDS = original_backoff


def test_notifier_succeeds_on_retry():
    from app.services import mapalab_notifier
    s, original = _mock_settings_with_url()
    original_backoff = mapalab_notifier._BACKOFF_BASE_SECONDS
    mapalab_notifier._BACKOFF_BASE_SECONDS = 0.01
    try:
        attempts = {'n': 0}

        def handler(request):
            attempts['n'] += 1
            if attempts['n'] < 2:
                return httpx.Response(503)
            return httpx.Response(200, json={'ok': True})

        transport = httpx.MockTransport(handler)
        real_client = httpx.Client
        with patch('httpx.Client', lambda **kw: real_client(transport=transport, **{k: v for k, v in kw.items() if k != 'transport'})):
            mapalab_notifier._do_notify()

        assert attempts['n'] == 2
    finally:
        s.mapalab_backend_url = original
        mapalab_notifier._BACKOFF_BASE_SECONDS = original_backoff


def test_notifier_debounces_multiple_calls():
    from app.services import mapalab_notifier
    s, original = _mock_settings_with_url()
    try:
        hit_count = {'n': 0}

        def handler(request):
            hit_count['n'] += 1
            return httpx.Response(200, json={'ok': True})

        transport = httpx.MockTransport(handler)
        real_client = httpx.Client
        with patch('httpx.Client', lambda **kw: real_client(transport=transport, **{k: v for k, v in kw.items() if k != 'transport'})):
            for _ in range(5):
                mapalab_notifier.notify_tree_changed()

            deadline = time.monotonic() + 10
            while hit_count['n'] == 0 and time.monotonic() < deadline:
                time.sleep(0.2)

        assert hit_count['n'] == 1, f'esperado 1 hit tras debounce, recibido {hit_count["n"]}'
    finally:
        s.mapalab_backend_url = original


class _RedisDeMemoria:
    def __init__(self):
        self.kv = {}
        self.ttls = {}
        self.falla = False

    def pipeline(self):
        if self.falla:
            raise RuntimeError('redis caido')
        return _PipelineDeMemoria(self)

    def get(self, clave):
        if self.falla:
            raise RuntimeError('redis caido')
        return self.kv.get(clave)


class _PipelineDeMemoria:
    def __init__(self, store):
        self.store = store
        self.ops = []

    def incr(self, clave, cantidad=1):
        self.ops.append(('incr', clave, cantidad))
        return self

    def expire(self, clave, ttl, nx=False):
        self.ops.append(('expire', clave, ttl, nx))
        return self

    def execute(self):
        for op in self.ops:
            if op[0] == 'incr':
                self.store.kv[op[1]] = int(self.store.kv.get(op[1], 0)) + op[2]
            elif not (op[3] and op[1] in self.store.ttls):
                self.store.ttls[op[1]] = op[2]
        self.ops = []
        return []


def test_metrics_endpoint_ya_no_existe(client):
    assert client.get('/metrics').status_code == 404


def test_ontoy_expone_los_checks_de_senales(client):
    checks = client.get('/ontoy').json()['checks']

    assert set(checks['abuso']) >= {'status', 'ventana_minutos', 'login_failed'}
    assert checks['mapalab_notify']['status'] in {'ok', 'degraded'}


def test_abuso_pasa_a_degraded_al_cruzar_el_umbral(monkeypatch):
    from app.api import metrics as m

    fake = _RedisDeMemoria()
    monkeypatch.setattr(m, 'redis_client', fake)

    m.registrar(m.SENAL_LOGIN_FALLIDO, m.UMBRAL_ABUSO - 1)
    assert m.check_abuso()['status'] == 'ok'

    m.registrar(m.SENAL_RATE_LIMIT)
    resultado = m.check_abuso()
    assert resultado['status'] == 'degraded'
    assert resultado['login_failed'] == m.UMBRAL_ABUSO - 1
    assert resultado['rate_limit_hits'] == 1


def test_la_ventana_solo_se_fija_una_vez(monkeypatch):
    from app.api import metrics as m

    fake = _RedisDeMemoria()
    monkeypatch.setattr(m, 'redis_client', fake)

    m.registrar(m.SENAL_LOGIN_FALLIDO)
    fake.ttls[m._clave(m.SENAL_LOGIN_FALLIDO)] = 42
    m.registrar(m.SENAL_LOGIN_FALLIDO)

    assert fake.ttls[m._clave(m.SENAL_LOGIN_FALLIDO)] == 42


def test_senales_toleran_redis_caido(monkeypatch):
    from app.api import metrics as m

    fake = _RedisDeMemoria()
    fake.falla = True
    monkeypatch.setattr(m, 'redis_client', fake)

    m.registrar(m.SENAL_LOGIN_FALLIDO)
    assert m.check_abuso()['status'] == 'ok'
    assert m.check_mapalab_notify()['fallos'] == 0
