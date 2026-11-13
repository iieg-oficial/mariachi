"""Tests del rate limiter con scopes separados.

Verifica que (a) sin scope se preserva el comportamiento legado (mismo bucket),
y (b) con scopes distintos los limiters NO se 'comen' entre si.
"""
import pytest
from starlette.requests import Request

from app.api import rate_limit as rate_limit_module
from app.services import incidentes as incidentes_module


class _StubUser:
    def __init__(self, user_id: int = 1, username: str = 'tester'):
        self.id = user_id
        self.username = username


class _FakePipeline:
    def __init__(self, store: dict):
        self._store = store
        self._last_key: str | None = None
        self._added = False

    def zremrangebyscore(self, key, lo, hi):
        self._store.setdefault(key, [])

    def zadd(self, key, mapping):
        self._store.setdefault(key, []).extend(mapping.values())
        self._last_key = key
        self._added = True

    def zcard(self, key):
        self._last_key = key

    def pexpire(self, key, ms):
        pass

    def execute(self):
        return (0, 0, len(self._store.get(self._last_key, [])), True)


class _FakeRedis:
    def __init__(self):
        self.store: dict[str, list] = {}
        self.stream: list[dict] = []

    def pipeline(self):
        return _FakePipeline(self.store)

    def zrange(self, key, lo, hi, withscores=False):
        return []

    def zrem(self, key, member):
        self.store.get(key, []).pop()

    def xadd(self, stream, campos, maxlen=None, approximate=True):
        self.stream.append(campos)


@pytest.fixture(autouse=True)
def _fake_redis(monkeypatch):
    fake = _FakeRedis()
    monkeypatch.setattr(rate_limit_module, 'redis_client', fake)
    monkeypatch.setattr(incidentes_module, 'redis_client', fake)
    return fake


def _request() -> Request:
    return Request({'type': 'http', 'method': 'POST', 'path': '/x', 'headers': []})


async def _hit_n_times(limiter, n: int, user: _StubUser):
    for _ in range(n):
        await limiter(request=_request(), current_user=user)


class TestRateLimitScopes:
    @pytest.mark.asyncio
    async def test_sin_scope_mismo_bucket(self, _fake_redis):
        a = rate_limit_module.rate_limit(max_requests=10, window_seconds=60.0)
        b = rate_limit_module.rate_limit(max_requests=10, window_seconds=60.0)
        user = _StubUser(user_id=42)

        await a(request=_request(), current_user=user)
        await b(request=_request(), current_user=user)

        # Sin scope, ambos comparten la misma key legada.
        keys = list(_fake_redis.store.keys())
        assert keys == [f'{rate_limit_module._KEY_PREFIX}:user:42']
        assert len(_fake_redis.store[keys[0]]) == 2

    @pytest.mark.asyncio
    async def test_scopes_distintos_buckets_separados(self, _fake_redis):
        reader = rate_limit_module.rate_limit(
            max_requests=10, window_seconds=60.0, scope='geoserver_read'
        )
        writer = rate_limit_module.rate_limit(
            max_requests=10, window_seconds=60.0, scope='geoserver_write'
        )
        user = _StubUser(user_id=42)

        await _hit_n_times(reader, 5, user)
        await _hit_n_times(writer, 3, user)

        # Cada scope tiene su propio bucket; un scope no consume del otro.
        prefix = rate_limit_module._KEY_PREFIX
        assert len(_fake_redis.store[f'{prefix}:user:42:geoserver_read']) == 5
        assert len(_fake_redis.store[f'{prefix}:user:42:geoserver_write']) == 3

    @pytest.mark.asyncio
    async def test_429_solo_aplica_al_scope_topado(self, _fake_redis):
        from fastapi import HTTPException

        reader = rate_limit_module.rate_limit(
            max_requests=2, window_seconds=60.0, scope='read'
        )
        writer = rate_limit_module.rate_limit(
            max_requests=10, window_seconds=60.0, scope='write'
        )
        user = _StubUser(user_id=99)

        await reader(request=_request(), current_user=user)
        await reader(request=_request(), current_user=user)
        with pytest.raises(HTTPException) as exc:
            await reader(request=_request(), current_user=user)
        assert exc.value.status_code == 429

        # write sigue funcionando porque tiene su propio bucket.
        await writer(request=_request(), current_user=user)


class TestRechazos:
    @pytest.mark.asyncio
    async def test_el_rechazo_no_alarga_el_bloqueo(self, _fake_redis):
        from fastapi import HTTPException

        limiter = rate_limit_module.rate_limit(max_requests=2, window_seconds=60.0, scope='x')
        user = _StubUser(user_id=7)
        await _hit_n_times(limiter, 2, user)
        for _ in range(5):
            with pytest.raises(HTTPException):
                await limiter(request=_request(), current_user=user)

        assert len(_fake_redis.store[f'{rate_limit_module._KEY_PREFIX}:user:7:x']) == 2

    @pytest.mark.asyncio
    async def test_el_rechazo_deja_incidente_con_usuario_y_scope(self, _fake_redis):
        from fastapi import HTTPException

        limiter = rate_limit_module.rate_limit(max_requests=1, window_seconds=60.0, scope='grid_write')
        user = _StubUser(user_id=8, username='alguien')
        await limiter(request=_request(), current_user=user)
        with pytest.raises(HTTPException):
            await limiter(request=_request(), current_user=user)

        assert _fake_redis.stream == [{
            'tipo': 'usuario', 'scope': 'grid_write', 'actor': 'alguien',
            'metodo': 'POST', 'ruta': '', 'golpes': '2', 'limite': '1', 'ventana_s': '60',
        }]

    @pytest.mark.asyncio
    async def test_por_ip_guarda_huella_y_no_la_ip(self, _fake_redis, caplog):
        from fastapi import HTTPException

        limiter = rate_limit_module.rate_limit_ip(max_requests=1, window_seconds=60.0, scope='reportes')
        req = Request({'type': 'http', 'method': 'POST', 'path': '/x', 'headers': [(b'x-real-ip', b'10.1.2.3')]})
        await limiter(req)
        with pytest.raises(HTTPException):
            await limiter(req)

        actor = _fake_redis.stream[0]['actor']
        assert actor.startswith('ip:')
        assert '10.1.2.3' not in actor
        assert '10.1.2.3' not in caplog.text
