from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_csrf
from app.api.rate_limit import _client_ip
from app.core.database import get_dataengine_db
from app.models.user import Usuario
from app.schemas.mapalab_acceso import (
    MapalabAccesoGuardar,
    MapalabAccesoResponse,
    MapalabCapaPrivadaResponse,
    MapalabGeoserverSincronizacion,
    MapalabGrupoGuardar,
    MapalabGrupoResponse,
    MapalabUsuarioActualizar,
    MapalabUsuarioCrear,
    MapalabUsuarioResponse,
)
from app.services import mapalab_acceso, mapalab_geoserver_acl
from app.services.actividad_service import registrar_actividad
from app.services.mapalab_notifier import notify_tree_changed

router = APIRouter(prefix="/mapalab/acceso", tags=["mapalab acceso"])


def _registrar(db: Session, request: Request, actor: Usuario, accion: str, tipo: str, recurso: Any, datos: dict | None = None) -> None:
    registrar_actividad(
        db, actor=actor, action=f"mapalab_acceso.{accion}", resource_type=tipo,
        resource_id=recurso, metadata=datos, ip=_client_ip(request),
    )
    db.commit()


@router.get("/usuarios", response_model=list[MapalabUsuarioResponse])
def listar_usuarios(de: Session = Depends(get_dataengine_db)) -> list[dict[str, Any]]:
    return mapalab_acceso.listar_usuarios(de)


@router.post("/usuarios", response_model=MapalabUsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    datos: MapalabUsuarioCrear,
    request: Request,
    de: Session = Depends(get_dataengine_db),
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
) -> dict[str, Any]:
    usuario = mapalab_acceso.crear_usuario(de, datos.correo, datos.nombre)
    _registrar(db, request, actor, "usuario.crear", "mapalab_usuario", usuario["id"], {"correo": usuario["correo"]})
    return usuario


@router.patch("/usuarios/{usuario_id}", response_model=MapalabUsuarioResponse)
def actualizar_usuario(
    usuario_id: int,
    datos: MapalabUsuarioActualizar,
    request: Request,
    de: Session = Depends(get_dataengine_db),
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
) -> dict[str, Any]:
    cambios = datos.model_dump(exclude_unset=True)
    usuario = mapalab_acceso.actualizar_usuario(de, usuario_id, cambios)
    _registrar(db, request, actor, "usuario.editar", "mapalab_usuario", usuario_id, cambios)
    notify_tree_changed()
    return usuario


@router.delete("/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_usuario(
    usuario_id: int,
    request: Request,
    de: Session = Depends(get_dataengine_db),
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
) -> None:
    mapalab_acceso.eliminar_usuario(de, usuario_id)
    _registrar(db, request, actor, "usuario.eliminar", "mapalab_usuario", usuario_id)
    notify_tree_changed()


@router.get("/grupos", response_model=list[MapalabGrupoResponse])
def listar_grupos(de: Session = Depends(get_dataengine_db)) -> list[dict[str, Any]]:
    return mapalab_acceso.listar_grupos(de)


@router.post("/grupos", response_model=MapalabGrupoResponse, status_code=status.HTTP_201_CREATED)
def crear_grupo(
    datos: MapalabGrupoGuardar,
    request: Request,
    de: Session = Depends(get_dataengine_db),
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
) -> dict[str, Any]:
    grupo = mapalab_acceso.guardar_grupo(de, None, datos.model_dump())
    _registrar(db, request, actor, "grupo.crear", "mapalab_grupo", grupo["id"], {"nombre": grupo["nombre"]})
    return grupo


@router.put("/grupos/{grupo_id}", response_model=MapalabGrupoResponse)
def editar_grupo(
    grupo_id: int,
    datos: MapalabGrupoGuardar,
    request: Request,
    de: Session = Depends(get_dataengine_db),
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
) -> dict[str, Any]:
    grupo = mapalab_acceso.guardar_grupo(de, grupo_id, datos.model_dump())
    _registrar(db, request, actor, "grupo.editar", "mapalab_grupo", grupo_id, {"miembros": grupo["miembros"]})
    notify_tree_changed()
    return grupo


@router.delete("/grupos/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_grupo(
    grupo_id: int,
    request: Request,
    de: Session = Depends(get_dataengine_db),
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
) -> None:
    mapalab_acceso.eliminar_grupo(de, grupo_id)
    _registrar(db, request, actor, "grupo.eliminar", "mapalab_grupo", grupo_id)
    notify_tree_changed()


@router.get("/capas", response_model=list[MapalabCapaPrivadaResponse])
def capas_privadas(de: Session = Depends(get_dataengine_db)) -> list[dict[str, Any]]:
    return mapalab_acceso.capas_privadas(de)


@router.get("/capas/{layer_id}", response_model=MapalabAccesoResponse)
def acceso_de_capa(layer_id: str, de: Session = Depends(get_dataengine_db)) -> dict[str, Any]:
    return mapalab_acceso.acceso_de_capa(de, layer_id)


@router.put("/capas/{layer_id}", response_model=MapalabAccesoResponse)
def guardar_acceso(
    layer_id: str,
    datos: MapalabAccesoGuardar,
    request: Request,
    de: Session = Depends(get_dataengine_db),
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
) -> dict[str, Any]:
    nombre = getattr(actor, "name", None) or actor.username
    acceso = mapalab_acceso.guardar_acceso(de, layer_id, datos.model_dump(), nombre)
    _registrar(db, request, actor, "capa.guardar", "layer", layer_id, datos.model_dump())
    notify_tree_changed()
    acceso["geoserver_sincronizado"] = mapalab_geoserver_acl.sincronizar_sin_fallar(de) is not None
    return acceso


@router.post("/geoserver/sincronizar", response_model=MapalabGeoserverSincronizacion)
def sincronizar_geoserver(
    request: Request,
    de: Session = Depends(get_dataengine_db),
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
) -> dict[str, list[str]]:
    try:
        resultado = mapalab_geoserver_acl.sincronizar(de)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="GeoServer no respondió; intenta de nuevo") from exc
    _registrar(db, request, actor, "geoserver.sincronizar", "geoserver_acl", None, resultado)
    return resultado
