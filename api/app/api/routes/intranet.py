import logging
import re
from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from app.api.deps import get_current_user, require_permission, verify_csrf
from app.models.user import Usuario
from app.services.intranet_client import IntranetClient, IntranetError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/intranet", tags=["intranet"])

_gestionar = [Depends(require_permission("mariachi.intranet.manage"))]
_ARCHIVO = re.compile(
    r"^([0-9a-f]{16}/)?[0-9a-f]{32}"
    r"\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$"
)
_CARPETAS = frozenset({"carousel", "gallery", "documents"})


@dataclass(frozen=True)
class Recurso:
    lista: str
    alta: str
    item: str
    edita: bool = True


RECURSOS = {
    "carrusel": Recurso("/api/carousel/todos", "/api/carousel/", "/api/carousel/{id}"),
    "galeria": Recurso("/api/galeria/", "/api/galeria/", "/api/galeria/{id}", edita=False),
    "documentos": Recurso("/api/documentos/", "/api/documentos/", "/api/documentos/{id}"),
    "carpetas": Recurso("/api/carpetas/", "/api/carpetas/", "/api/carpetas/{id}"),
    "enlaces": Recurso("/api/footer/", "/api/footer/", "/api/footer/{id}"),
    "categorias": Recurso("/api/categorias/all", "/api/categorias/create", "/api/categorias/{id}"),
    "sitios": Recurso("/api/status/sites", "/api/status/sites", "/api/status/sites/{id}"),
    "herramientas": Recurso(
        "/api/herramientas/todas", "/api/herramientas/", "/api/herramientas/{id}"
    ),
    "eventos": Recurso("/api/eventos/", "/api/eventos/", "/api/eventos/{id}"),
    "solicitudes": Recurso(
        "/api/solicitudes-cuenta/", "/api/solicitudes-cuenta/", "/api/solicitudes-cuenta/{id}"
    ),
}


def _recurso(nombre: str) -> Recurso:
    recurso = RECURSOS.get(nombre)
    if recurso is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso no encontrado")
    return recurso


def _actor(usuario: Usuario) -> str:
    return usuario.minerva_sub or f"mariachi:{usuario.id}"


def _perfil(usuario: Usuario) -> dict[str, str]:
    return {
        "nombre": getattr(usuario, "name", None) or "",
        "avatar": getattr(usuario, "avatar_url", None) or "",
    }


def _reenviar(
    metodo: str,
    ruta: str,
    usuario: Usuario,
    contenido: bytes | None = None,
    tipo_contenido: str | None = None,
) -> Response:
    try:
        respuesta = IntranetClient().pedir(
            metodo, ruta, _actor(usuario), contenido, tipo_contenido, _perfil(usuario)
        )
    except IntranetError as exc:
        logger.warning("intranet: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="La intranet no está disponible"
        ) from exc
    if respuesta.status_code in (401, 403):
        logger.error("intranet rechazo la clave de mariachi: %s", respuesta.status_code)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="La intranet no aceptó la clave de mariachi",
        )
    return Response(
        content=respuesta.content,
        status_code=respuesta.status_code,
        media_type=respuesta.headers.get("content-type"),
    )


@router.get("/archivos/{carpeta}/{nombre:path}")
def archivo(carpeta: str, nombre: str, usuario: Usuario = Depends(get_current_user)) -> Response:
    if carpeta not in _CARPETAS or not _ARCHIVO.match(nombre):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")
    return _reenviar("GET", f"/static/uploads/{carpeta}/{nombre}", usuario)


@router.get("/personas")
def listar_personas(usuario: Usuario = Depends(get_current_user)) -> Response:
    return _reenviar("GET", "/api/usuarios/", usuario)


@router.put("/personas/{item_id}/presencia", dependencies=_gestionar)
async def cambiar_presencia(
    item_id: int, request: Request, usuario: Usuario = Depends(verify_csrf)
) -> Response:
    return await run_in_threadpool(
        _reenviar,
        "PUT",
        f"/api/usuarios/{item_id}/presencia",
        usuario,
        await request.body(),
        request.headers.get("content-type"),
    )


@router.get("/{nombre}")
def listar(nombre: str, usuario: Usuario = Depends(get_current_user)) -> Response:
    return _reenviar("GET", _recurso(nombre).lista, usuario)


@router.post("/{nombre}", dependencies=_gestionar)
async def crear(nombre: str, request: Request, usuario: Usuario = Depends(verify_csrf)) -> Response:
    recurso = _recurso(nombre)
    return await run_in_threadpool(
        _reenviar,
        "POST",
        recurso.alta,
        usuario,
        await request.body(),
        request.headers.get("content-type"),
    )


@router.put("/carrusel/{item_id}/revisar", dependencies=_gestionar)
async def revisar(
    item_id: int, request: Request, usuario: Usuario = Depends(verify_csrf)
) -> Response:
    return await run_in_threadpool(
        _reenviar,
        "PUT",
        f"/api/carousel/{item_id}/revisar",
        usuario,
        await request.body(),
        request.headers.get("content-type"),
    )


@router.put("/{nombre}/{item_id}", dependencies=_gestionar)
async def actualizar(
    nombre: str, item_id: int, request: Request, usuario: Usuario = Depends(verify_csrf)
) -> Response:
    recurso = _recurso(nombre)
    if not recurso.edita:
        raise HTTPException(
            status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail="Este recurso no se edita"
        )
    return await run_in_threadpool(
        _reenviar,
        "PUT",
        recurso.item.format(id=item_id),
        usuario,
        await request.body(),
        request.headers.get("content-type"),
    )


@router.delete("/{nombre}/{item_id}", dependencies=_gestionar)
def eliminar(nombre: str, item_id: int, usuario: Usuario = Depends(verify_csrf)) -> Response:
    return _reenviar("DELETE", _recurso(nombre).item.format(id=item_id), usuario)
