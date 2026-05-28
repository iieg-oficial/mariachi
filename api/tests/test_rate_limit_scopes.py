"""Tests del rate limiter con scopes separados.

Verifica que (a) sin scope se preserva el comportamiento legado (mismo bucket),
y (b) con scopes distintos los limiters NO se 'comen' entre si.
"""
import pytest

from app.api import rate_limit as rate_limit_module


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

    def pipeline(self):
        return _FakePipeline(self.store)

    def zrange(self, key, lo, hi, withscores=False):
        return []


@pytest.fixture(autouse=True)
def _fake_redis(monkeypatch):
    fake = _FakeRedis()
    monkeypatch.setattr(rate_limit_module, 'redis_client', fake)
    return fake


async def _hit_n_times(limiter, n: int, user: _StubUser):
    for _ in range(n):
        await limiter(current_user=user)


class TestRateLimitScopes:
    @pytest.mark.asyncio
    async def test_sin_scope_mismo_bucket(self, _fake_redis):
        a = rate_limit_module.rate_limit(max_requests=10, window_seconds=60.0)
        b = rate_limit_module.rate_limit(max_requests=10, window_seconds=60.0)
        user = _StubUser(user_id=42)

        await a(current_user=user)
        await b(current_user=user)

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

        await reader(current_user=user)
        await reader(current_user=user)
        with pytest.raises(HTTPException) as exc:
            await reader(current_user=user)
        assert exc.value.status_code == 429

        # write sigue funcionando porque tiene su propio bucket.
        await writer(current_user=user)
