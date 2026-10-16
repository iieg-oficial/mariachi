from __future__ import annotations

import threading
import time
from collections.abc import Generator

import httpx

RENEW_MARGIN_SECONDS = 60


class ServiceTokenError(Exception):
    pass


class ServiceTokenProvider:
    def __init__(
        self,
        issuer_url: str,
        client_id: str,
        client_secret: str,
        audience: str,
        timeout: float = 10.0,
        transport: httpx.BaseTransport | None = None,
    ):
        self._token_url = f"{issuer_url.rstrip('/')}/auth/token"
        self._client_id = client_id
        self._client_secret = client_secret
        self._audience = audience
        self._timeout = timeout
        self._transport = transport
        self._lock = threading.Lock()
        self._token: str | None = None
        self._expires_at = 0.0

    def token(self) -> str:
        with self._lock:
            if self._token is None or time.monotonic() >= self._expires_at - RENEW_MARGIN_SECONDS:
                self._token, self._expires_at = self._fetch()
            return self._token

    def invalidate(self) -> None:
        with self._lock:
            self._token = None
            self._expires_at = 0.0

    def _fetch(self) -> tuple[str, float]:
        data = {
            "grant_type": "client_credentials",
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "audience": self._audience,
        }
        try:
            with httpx.Client(timeout=self._timeout, transport=self._transport) as client:
                r = client.post(self._token_url, data=data)
        except httpx.HTTPError as exc:
            raise ServiceTokenError(f"minerva no respondio al pedir el token de servicio: {exc}") from exc
        if r.status_code != 200:
            try:
                detalle = r.json().get("error_description") or r.text
            except ValueError:
                detalle = r.text
            raise ServiceTokenError(f"minerva nego el token de servicio ({r.status_code}): {detalle}")
        body = r.json()
        token = body.get("access_token")
        if not token:
            raise ServiceTokenError("minerva respondio sin access_token")
        return token, time.monotonic() + float(body.get("expires_in", 0))


class ServiceTokenAuth(httpx.Auth):
    def __init__(self, provider: ServiceTokenProvider):
        self._provider = provider

    def auth_flow(self, request: httpx.Request) -> Generator[httpx.Request, httpx.Response, None]:
        request.headers["Authorization"] = f"Bearer {self._provider.token()}"
        response = yield request
        if response.status_code == 401:
            self._provider.invalidate()
            request.headers["Authorization"] = f"Bearer {self._provider.token()}"
            yield request


_providers: dict[tuple[str, str, str], ServiceTokenProvider] = {}
_providers_lock = threading.Lock()


def shared_provider(issuer_url: str, client_id: str, client_secret: str, audience: str) -> ServiceTokenProvider:
    key = (issuer_url, client_id, audience)
    with _providers_lock:
        provider = _providers.get(key)
        if provider is None:
            provider = ServiceTokenProvider(issuer_url, client_id, client_secret, audience)
            _providers[key] = provider
        return provider
