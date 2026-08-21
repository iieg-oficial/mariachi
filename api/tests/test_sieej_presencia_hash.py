"""Tests de la presencia por HASH que usa el polling de captura.

Las funciones con `scan_iter` del CMS quedan intactas y no se tocan aqui.
"""
import json
import time

import pytest

from app.services import presence

SCOPE = "sieej_envio"


class _FakeHashPipeline:
    def __init__(self, redis):
        self.redis = redis
        self.ops = []

    def hset(self, key, field, value):
        self.ops.append(("hset", key, field, value))

    def expire(self, key, ttl):
        self.ops.append(("expire", key, ttl))

    def execute(self):
        for op in self.ops:
            if op[0] == "hset":
                self.redis.hset(op[1], op[2], op[3])
            else:
                self.redis.expire(op[1], op[2])
        self.ops = []


class _FakeRedis:
    def __init__(self):
        self.hashes: dict[str, dict[str, str]] = {}
        self.ttls: dict[str, int] = {}
        self.caido = False

    def _check(self):
        if self.caido:
            raise RuntimeError("redis caido")

    def pipeline(self):
        return _FakeHashPipeline(self)

    def hset(self, key, field, value):
        self._check()
        self.hashes.setdefault(key, {})[field] = value

    def expire(self, key, ttl):
        self._check()
        self.ttls[key] = ttl

    def hgetall(self, key):
        self._check()
        return dict(self.hashes.get(key, {}))

    def hdel(self, key, *fields):
        self._check()
        for field in fields:
            self.hashes.get(key, {}).pop(field, None)


@pytest.fixture
def fake_redis(monkeypatch):
    fake = _FakeRedis()
    monkeypatch.setattr(presence, "redis_client", fake)
    return fake


def test_quien_entra_aparece_para_los_demas_y_no_para_si_mismo(fake_redis):
    presence.entrar(SCOPE, 7, "ana", "Ana Lopez", seccion="general")

    assert presence.presentes(SCOPE, 7, excluir="ana") == []
    otros = presence.presentes(SCOPE, 7, excluir="beto")
    assert len(otros) == 1
    assert otros[0]["username"] == "ana"
    assert otros[0]["seccion"] == "general"


def test_una_sola_lectura_trae_a_todo_el_equipo(fake_redis):
    presence.entrar(SCOPE, 7, "ana", "Ana Lopez")
    presence.entrar(SCOPE, 7, "beto", "Beto Ruiz")
    presence.entrar(SCOPE, 8, "carla", "Carla Diaz")

    usernames = {e["username"] for e in presence.presentes(SCOPE, 7)}
    assert usernames == {"ana", "beto"}


def test_salir_borra_la_entrada_sin_esperar_al_ttl(fake_redis):
    presence.entrar(SCOPE, 7, "ana", "Ana Lopez")
    presence.salir(SCOPE, 7, "ana")

    assert presence.presentes(SCOPE, 7) == []


def test_lo_vencido_no_se_lista_y_se_limpia_al_leer(fake_redis):
    presence.entrar(SCOPE, 7, "ana", "Ana Lopez")
    key = f"presencia:{SCOPE}:7"
    entrada = json.loads(fake_redis.hashes[key]["ana"])
    entrada["ts"] = time.time() - presence.PRESENCE_TTL_SECONDS - 1
    fake_redis.hashes[key]["ana"] = json.dumps(entrada)

    assert presence.presentes(SCOPE, 7) == []
    assert "ana" not in fake_redis.hashes[key]


def test_una_entrada_corrupta_se_descarta_en_vez_de_reventar(fake_redis):
    presence.entrar(SCOPE, 7, "ana", "Ana Lopez")
    fake_redis.hashes[f"presencia:{SCOPE}:7"]["beto"] = "no es json"

    assert [e["username"] for e in presence.presentes(SCOPE, 7)] == ["ana"]


def test_con_redis_caido_la_presencia_se_vacia_sin_lanzar(fake_redis):
    presence.entrar(SCOPE, 7, "ana", "Ana Lopez")
    fake_redis.caido = True

    presence.entrar(SCOPE, 7, "beto", "Beto Ruiz")
    presence.salir(SCOPE, 7, "ana")
    assert presence.presentes(SCOPE, 7) == []


def test_la_clave_lleva_ttl_para_que_el_cuarto_vacio_desaparezca(fake_redis):
    presence.entrar(SCOPE, 7, "ana", "Ana Lopez")

    assert fake_redis.ttls[f"presencia:{SCOPE}:7"] == (
        presence.PRESENCE_TTL_SECONDS * 2
    )
