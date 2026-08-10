import pytest

from app.core import refresh_token as refresh_token_module
from app.core.security import decodificar_token
from tests.conftest import (
    ADMIN_PREFIX,
    TODOS_LOS_PERMISOS,
    establecer_cookies_de_sesion,
    login_as,
)


class _FakePipeline:
    def __init__(self, store):
        self.store = store
        self.ops = []

    def setex(self, key, ttl, value):
        self.ops.append(("setex", key, ttl, value))
        return self

    def sadd(self, key, *members):
        self.ops.append(("sadd", key, members))
        return self

    def expire(self, key, ttl):
        self.ops.append(("expire", key, ttl))
        return self

    def delete(self, *keys):
        self.ops.append(("delete", keys))
        return self

    def execute(self):
        results = []
        for op in self.ops:
            if op[0] == "setex":
                self.store.setex(op[1], op[2], op[3])
                results.append(True)
            elif op[0] == "sadd":
                results.append(self.store.sadd(op[1], *op[2]))
            elif op[0] == "expire":
                results.append(True)
            elif op[0] == "delete":
                results.append(self.store.delete(*op[1]))
        self.ops = []
        return results


class FakeRedis:
    def __init__(self):
        self.kv = {}
        self.sets = {}

    def pipeline(self):
        return _FakePipeline(self)

    def get(self, key):
        return self.kv.get(key)

    def setex(self, key, ttl, value):
        self.kv[key] = value
        return True

    def set(self, key, value):
        self.kv[key] = value
        return True

    def ttl(self, key):
        return 100 if key in self.kv else -2

    def sadd(self, key, *members):
        bucket = self.sets.setdefault(key, set())
        added = 0
        for member in members:
            if member not in bucket:
                bucket.add(member)
                added += 1
        return added

    def smembers(self, key):
        return set(self.sets.get(key, set()))

    def delete(self, *keys):
        removed = 0
        for key in keys:
            if key in self.kv:
                del self.kv[key]
                removed += 1
            if key in self.sets:
                del self.sets[key]
                removed += 1
        return removed

    def expire(self, key, ttl):
        return True


@pytest.fixture
def fake_refresh_redis(monkeypatch):
    fake = FakeRedis()
    monkeypatch.setattr(refresh_token_module, "redis_client", fake)
    return fake


def test_la_sesion_del_callback_trae_access_y_refresh(client, admin_user, fake_refresh_redis):
    establecer_cookies_de_sesion(client, admin_user)
    assert client.cookies.get("access_token")
    assert client.cookies.get("refresh_token")


def test_refrescar_renueva_cookies(client, admin_user, fake_refresh_redis):
    establecer_cookies_de_sesion(client, admin_user)
    response = client.post(f"{ADMIN_PREFIX}/autenticacion/refrescar")
    assert response.status_code == 200
    assert "csrf_token" in response.json()
    names = [c.name for c in response.cookies.jar]
    assert "access_token" in names
    assert "refresh_token" in names


def test_refrescar_conserva_el_sid_de_la_sesion(client, admin_user, fake_refresh_redis):
    sid = establecer_cookies_de_sesion(client, admin_user)
    refresh = client.cookies.get("refresh_token")
    client.cookies.clear()
    client.cookies.set("refresh_token", refresh)

    response = client.post(f"{ADMIN_PREFIX}/autenticacion/refrescar")
    assert response.status_code == 200

    payload = decodificar_token(response.cookies.get("access_token"))
    assert payload["sub"] == "admin_test"
    assert payload["sid"] == sid


def test_refrescar_sin_cookie(client, admin_user, fake_refresh_redis):
    response = client.post(f"{ADMIN_PREFIX}/autenticacion/refrescar")
    assert response.status_code == 401


def test_refrescar_cookie_invalida(client, admin_user, fake_refresh_redis):
    client.cookies.set("refresh_token", "no-existe")
    response = client.post(f"{ADMIN_PREFIX}/autenticacion/refrescar")
    assert response.status_code == 401


def test_refrescar_rotacion_detecta_reuso(client, admin_user, fake_refresh_redis):
    establecer_cookies_de_sesion(client, admin_user)
    old_refresh = client.cookies.get("refresh_token")
    assert old_refresh

    first = client.post(f"{ADMIN_PREFIX}/autenticacion/refrescar")
    assert first.status_code == 200
    new_refresh = first.cookies.get("refresh_token")
    assert new_refresh and new_refresh != old_refresh

    client.cookies.clear()
    client.cookies.set("refresh_token", old_refresh)
    reuse = client.post(f"{ADMIN_PREFIX}/autenticacion/refrescar")
    assert reuse.status_code == 401

    client.cookies.clear()
    client.cookies.set("refresh_token", new_refresh)
    revoked = client.post(f"{ADMIN_PREFIX}/autenticacion/refrescar")
    assert revoked.status_code == 401


def test_logout_revoca_refresh(client, admin_user, fake_refresh_redis):
    establecer_cookies_de_sesion(client, admin_user)
    csrf = login_as(client, admin_user, TODOS_LOS_PERMISOS)
    refresh = client.cookies.get("refresh_token")

    logout = client.post(
        f"{ADMIN_PREFIX}/autenticacion/cerrar-sesion",
        headers={"X-CSRF-Token": csrf},
    )
    assert logout.status_code == 200

    client.cookies.clear()
    client.cookies.set("refresh_token", refresh)
    response = client.post(f"{ADMIN_PREFIX}/autenticacion/refrescar")
    assert response.status_code == 401
