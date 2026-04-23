"""Tests de integracion cruzada mariachi -> mapalab.

Valida que el notifier dispara POST al backend de mapalab con el shape correcto
y respeta el debounce. No requiere mapalab corriendo (usa httpx.MockTransport).
"""
import threading
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
    from app.services import mapalab_notifier
    from app.core.settings import get_settings
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


def test_notifier_retries_on_failure():
    from app.services import mapalab_notifier
    from app.api.metrics import COUNTER_TREE_NOTIFY_FAILED, _counters
    s, original = _mock_settings_with_url()
    original_backoff = mapalab_notifier._BACKOFF_BASE_SECONDS
    mapalab_notifier._BACKOFF_BASE_SECONDS = 0.01
    failed_before = _counters.get(COUNTER_TREE_NOTIFY_FAILED, 0)
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
        failed_after = _counters.get(COUNTER_TREE_NOTIFY_FAILED, 0)
        assert failed_after - failed_before == 1
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


def test_metrics_endpoint_returns_prometheus_format(client):
    response = client.get('/metrics')
    assert response.status_code == 200
    assert 'text/plain' in response.headers['content-type']
    body = response.text
    assert body.endswith('\n')


def test_metrics_counters_increment_on_rate_limit_hit():
    from app.api import metrics as m

    before = m._counters.get(m.COUNTER_RATE_LIMIT_HITS, 0)
    m.incr(m.COUNTER_RATE_LIMIT_HITS, amount=3)
    after = m._counters.get(m.COUNTER_RATE_LIMIT_HITS, 0)
    assert after - before == 3


def test_metrics_thread_safe():
    from app.api import metrics as m
    counter_name = 'test_thread_counter'
    m._counters[counter_name] = 0

    def worker():
        for _ in range(1000):
            m.incr(counter_name)

    threads = [threading.Thread(target=worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert m._counters[counter_name] == 10_000
