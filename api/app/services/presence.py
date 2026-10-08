"""Quien esta viendo que, con TTL corto en Redis.

Dos representaciones conviven. Las funciones con `_key` guardan una clave por
persona y se listan con `scan_iter`: sirven para el CMS, donde hay pocos
editores y el polling es esporadico. Las que trabajan sobre un HASH por recurso
se leen con un solo `HGETALL` y son las del polling sostenido de la captura
colaborativa: `scan_iter` recorre el keyspace y, con redis-py sincrono dentro de
un handler `async def`, eso bloquea el event loop del worker.

Redis no expira campos sueltos de un hash antes de 7.4, asi que el TTL vive en
la clave y las entradas vencidas se descartan al leer.
"""
import json
import time

from app.core.cache import get_cache, redis_client, set_cache

PRESENCE_TTL_SECONDS = 30


def _key(scope: str, resource_id: str | int, username: str) -> str:
    return f"presencia:{scope}:{resource_id}:{username}"


def register(
    scope: str,
    resource_id: str | int,
    username: str,
    name: str,
    **extra: object,
) -> None:
    set_cache(
        _key(scope, resource_id, username),
        {"username": username, "name": name, **extra},
        expire=PRESENCE_TTL_SECONDS,
    )


def unregister(scope: str, resource_id: str | int, username: str) -> None:
    try:
        redis_client.delete(_key(scope, resource_id, username))
    except Exception:
        pass


def list_others(scope: str, resource_id: str | int, current_username: str) -> list[dict]:
    pattern = f"presencia:{scope}:{resource_id}:*"
    editores = []
    try:
        keys = list(redis_client.scan_iter(match=pattern, count=100))
    except Exception:
        return []
    for key in keys:
        data = get_cache(key)
        if data and data["username"] != current_username:
            editores.append(data)
    return editores


def list_by_resource(scope: str, current_username: str) -> dict[str, list[dict]]:
    pattern = f"presencia:{scope}:*"
    por_recurso: dict[str, list[dict]] = {}
    try:
        keys = list(redis_client.scan_iter(match=pattern, count=200))
    except Exception:
        return {}
    for raw_key in keys:
        data = get_cache(raw_key)
        if not data or data["username"] == current_username:
            continue
        key = raw_key.decode() if isinstance(raw_key, bytes) else str(raw_key)
        partes = key.split(":")
        if len(partes) < 4:
            continue
        por_recurso.setdefault(partes[2], []).append(data)
    return por_recurso


def _hash_key(scope: str, resource_id: str | int) -> str:
    return f"presencia:{scope}:{resource_id}"


def entrar(
    scope: str,
    resource_id: str | int,
    username: str,
    name: str,
    **extra: object,
) -> None:
    """Marca a alguien presente en el recurso y refresca el TTL de la clave."""
    entrada = {"username": username, "name": name, "ts": time.time(), **extra}
    try:
        pipe = redis_client.pipeline()
        pipe.hset(_hash_key(scope, resource_id), username, json.dumps(entrada))
        pipe.expire(_hash_key(scope, resource_id), PRESENCE_TTL_SECONDS * 2)
        pipe.execute()
    except Exception:
        pass


def salir(scope: str, resource_id: str | int, username: str) -> None:
    try:
        redis_client.hdel(_hash_key(scope, resource_id), username)
    except Exception:
        pass


def presentes(
    scope: str, resource_id: str | int, *, excluir: str | None = None
) -> list[dict]:
    """Quienes siguen dentro del TTL, de un solo `HGETALL`.

    Aprovecha la lectura para limpiar lo vencido: sin eso, quien cierra la
    pestana sin avisar quedaria en el hash hasta que expire la clave entera.
    """
    key = _hash_key(scope, resource_id)
    try:
        crudos = redis_client.hgetall(key)
    except Exception:
        return []
    ahora = time.time()
    vivos: list[dict] = []
    vencidos: list[str] = []
    for username, raw in (crudos or {}).items():
        if isinstance(username, bytes):
            username = username.decode()
        try:
            entrada = json.loads(raw)
        except (TypeError, ValueError):
            vencidos.append(username)
            continue
        if ahora - float(entrada.get("ts") or 0) > PRESENCE_TTL_SECONDS:
            vencidos.append(username)
            continue
        if username == excluir:
            continue
        vivos.append(entrada)
    if vencidos:
        try:
            redis_client.hdel(key, *vencidos)
        except Exception:
            pass
    return vivos
