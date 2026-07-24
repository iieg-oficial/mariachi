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
