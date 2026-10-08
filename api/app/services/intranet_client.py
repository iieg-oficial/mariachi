from __future__ import annotations

from urllib.parse import quote

import httpx

from app.core.settings import get_settings

CABECERA_API_KEY = "X-API-Key"
CABECERA_ACTOR = "X-Actor-Sub"


class IntranetError(Exception):
    pass


class IntranetClient:
    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = (settings.intranet_api_url or "").rstrip("/")
        self._api_key = settings.intranet_api_key or ""
        self._timeout = settings.intranet_timeout
        if not self._base_url:
            raise IntranetError("INTRANET_API_URL no esta configurado")
        if not self._api_key:
            raise IntranetError("INTRANET_API_KEY no esta configurado")

    def pedir(
        self,
        metodo: str,
        ruta: str,
        actor: str,
        contenido: bytes | None = None,
        tipo_contenido: str | None = None,
        perfil: dict[str, str] | None = None,
    ) -> httpx.Response:
        cabeceras = {CABECERA_API_KEY: self._api_key, CABECERA_ACTOR: actor}
        for clave, valor in (perfil or {}).items():
            if valor:
                cabeceras[f"X-Actor-{clave.capitalize()}"] = quote(valor[:500], safe=":/@")
        if tipo_contenido:
            cabeceras["Content-Type"] = tipo_contenido
        try:
            with httpx.Client(timeout=self._timeout) as cliente:
                return cliente.request(
                    metodo, f"{self._base_url}{ruta}", headers=cabeceras, content=contenido
                )
        except httpx.HTTPError as exc:
            raise IntranetError("La intranet no responde") from exc
