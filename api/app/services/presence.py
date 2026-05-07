from app.core.cache import get_cache, redis_client, set_cache

PRESENCE_TTL_SECONDS = 30


def _key(scope: str, resource_id: str | int, username: str) -> str:
    return f"presencia:{scope}:{resource_id}:{username}"


def register(scope: str, resource_id: str | int, username: str, name: str) -> None:
    set_cache(
        _key(scope, resource_id, username),
        {"username": username, "name": name},
        expire=PRESENCE_TTL_SECONDS,
    )


def list_others(scope: str, resource_id: str | int, current_username: str) -> list[dict]:
    pattern = f"presencia:{scope}:{resource_id}:*"
    editores = []
    for key in redis_client.scan_iter(match=pattern, count=100):
        data = get_cache(key)
        if data and data["username"] != current_username:
            editores.append(data)
    return editores
