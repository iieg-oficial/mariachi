"""Conversión idempotente entre URL absoluta y relativa del Acervo.

Se persiste el path relativo (`bucket/object`) y se entrega absoluto al cliente.
Ambas funciones aceptan cualquiera de las dos formas: si el input ya está en el
formato esperado, se devuelve sin tocar. URLs externas (host distinto a
`ACERVO_PUBLIC_ENDPOINT`) se preservan como están — el helper solo opera sobre
URLs de nuestro propio acervo.
"""

from __future__ import annotations

from typing import Any

from app.core.settings import get_settings


def _scheme_and_host() -> tuple[str, str]:
    settings = get_settings()
    scheme = "https" if settings.acervo_use_ssl else "http"
    return scheme, settings.acervo_public_endpoint


def _absolute_prefixes() -> list[str]:
    scheme, host = _scheme_and_host()
    prefixes = [f"{scheme}://{host}/"]
    other = "http" if scheme == "https" else "https"
    prefixes.append(f"{other}://{host}/")
    return prefixes


def to_relative(value: str | None) -> str | None:
    if not value:
        return value
    if not isinstance(value, str):
        return value
    for prefix in _absolute_prefixes():
        if value.startswith(prefix):
            return value[len(prefix):].lstrip("/")
    if "://" in value:
        return value
    return value.lstrip("/")


def to_absolute(value: str | None) -> str | None:
    if not value:
        return value
    if not isinstance(value, str):
        return value
    if "://" in value:
        return value
    scheme, host = _scheme_and_host()
    return f"{scheme}://{host}/{value.lstrip('/')}"


_URL_KEY_SUFFIXES = ("_url", "Url")


def _is_url_key(key: str) -> bool:
    return any(key.endswith(suffix) for suffix in _URL_KEY_SUFFIXES)


def transform_urls(obj: Any, fn) -> Any:
    if isinstance(obj, dict):
        return {
            k: (fn(v) if _is_url_key(k) and isinstance(v, str) else transform_urls(v, fn))
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [transform_urls(item, fn) for item in obj]
    return obj


def to_relative_in(obj: Any) -> Any:
    return transform_urls(obj, to_relative)


def to_absolute_in(obj: Any) -> Any:
    return transform_urls(obj, to_absolute)
