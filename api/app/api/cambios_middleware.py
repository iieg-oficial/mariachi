from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.deps import PERMISOS_DE_LA_PETICION
from app.core.cambios import publicar
from app.core.security import decodificar_token
from app.core.settings import get_settings

settings = get_settings()

METODOS = {"POST", "PUT", "PATCH", "DELETE"}
EXCLUIDOS = {"auth", "cambios"}
SOLO_LECTURA = {"suggest", "preview", "vista-previa", "validate", "probar", "leer-archivo", "presencia"}


def evento_de(scope: Scope, status: int) -> dict | None:
    if scope.get("method") not in METODOS or not 200 <= status < 300:
        return None
    path: str = scope.get("path", "")
    prefijo = settings.admin_prefix
    if not path.startswith(f"{prefijo}/"):
        return None
    ruta = path[len(prefijo):]
    recurso = ruta.strip("/").split("/", 1)[0]
    ultimo = ruta.rstrip("/").rsplit("/", 1)[-1]
    if not recurso or recurso in EXCLUIDOS or ultimo in SOLO_LECTURA:
        return None
    token = Request(scope).cookies.get(settings.cookie_name)
    payload = decodificar_token(token) if token else None
    return {
        "tipo": "cambio",
        "recurso": recurso,
        "ruta": ruta,
        "metodo": scope["method"],
        "autor": (payload or {}).get("sub"),
        "permisos": scope.get(PERMISOS_DE_LA_PETICION, []),
    }


class CambiosMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("method") not in METODOS:
            await self.app(scope, receive, send)
            return

        estado = {"status": 0}

        async def enviar(message: Message) -> None:
            if message["type"] == "http.response.start":
                estado["status"] = message["status"]
            await send(message)

        await self.app(scope, receive, enviar)
        evento = evento_de(scope, estado["status"])
        if evento:
            publicar(evento)
