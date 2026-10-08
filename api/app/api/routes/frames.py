import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import require_permission, verify_csrf
from app.core.database import get_db
from app.models.frames import Camara
from app.models.user import Usuario
from app.schemas.frames import (
    AplicarResponse,
    CamaraCreate,
    CamaraResponse,
    CamaraUpdate,
    EstadoResponse,
    PreviewResponse,
)
from app.services import frames_config
from app.services.frames_client import FramesClient, FramesError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/frames", tags=["frames"])

_gestionar = [Depends(require_permission("mariachi.frames.manage"))]


def _camara(db: Session, camara_id: int) -> Camara:
    camara = db.query(Camara).filter(Camara.id == camara_id).first()
    if camara is None:
        raise HTTPException(status_code=404, detail="Camara no encontrada")
    return camara


def _construir(db: Session) -> dict:
    try:
        return frames_config.construir(db)
    except frames_config.FramesConfigError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/camaras", response_model=list[CamaraResponse])
async def listar(db: Session = Depends(get_db)):
    return db.query(Camara).order_by(Camara.orden, Camara.nombre).all()


@router.post("/camaras", response_model=CamaraResponse, status_code=201, dependencies=_gestionar)
async def crear(
    payload: CamaraCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    existente = db.query(Camara).filter(Camara.nombre == payload.nombre).first()
    if existente is not None:
        raise HTTPException(
            status_code=409, detail=f"Ya existe una camara llamada '{payload.nombre}'"
        )
    camara = Camara(**payload.model_dump())
    db.add(camara)
    db.commit()
    db.refresh(camara)
    return camara


@router.put("/camaras/{camara_id}", response_model=CamaraResponse, dependencies=_gestionar)
async def actualizar(
    camara_id: int,
    payload: CamaraUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    camara = _camara(db, camara_id)
    cambios = payload.model_dump(exclude_unset=True)
    if cambios.get("rtsp_url"):
        cambios["rtsp_url"] = frames_config.conservar_credenciales(
            cambios["rtsp_url"], camara.rtsp_url
        )
    for campo, valor in cambios.items():
        setattr(camara, campo, valor)
    db.commit()
    db.refresh(camara)
    return camara


@router.delete("/camaras/{camara_id}", status_code=204, dependencies=_gestionar)
async def eliminar(
    camara_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    camara = _camara(db, camara_id)
    db.delete(camara)
    db.commit()


@router.get("/estado", response_model=EstadoResponse)
async def estado(db: Session = Depends(get_db)):
    en_mariachi = [c.nombre for c in frames_config.camaras_activas(db)]
    try:
        cliente = FramesClient()
        version = cliente.version()
        en_frames = cliente.camaras()
    except Exception:
        logger.exception("frames.estado no disponible")
        return EstadoResponse(
            disponible=False,
            detalle="No se pudo consultar frames",
            camaras_en_mariachi=len(en_mariachi),
        )

    return EstadoResponse(
        disponible=True,
        version=version,
        camaras_en_frames=en_frames,
        camaras_en_mariachi=len(en_mariachi),
        sincronizado=sorted(en_frames) == sorted(en_mariachi),
    )


@router.get("/estado-camaras")
async def estado_camaras():
    try:
        return FramesClient().estado_camaras()
    except FramesError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/camaras/{nombre}/foto")
async def foto(nombre: str, alto: int = 360, db: Session = Depends(get_db)):
    camara = db.query(Camara).filter(Camara.nombre == nombre).first()
    if camara is None:
        raise HTTPException(status_code=404, detail="Camara no encontrada")
    if not camara.habilitada:
        raise HTTPException(status_code=409, detail="La camara esta apagada")

    alto = max(120, min(alto, 1080))

    try:
        contenido, tipo = FramesClient().foto(nombre, alto)
    except FramesError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("frames: fallo al leer la camara %s", nombre)
        raise HTTPException(status_code=502, detail="No se pudo leer la camara") from exc

    return Response(content=contenido, media_type=tipo, headers={"Cache-Control": "no-store"})


@router.get("/camaras/{nombre}/stream")
async def stream(nombre: str, fps: int = 3, alto: int = 360, db: Session = Depends(get_db)):
    camara = db.query(Camara).filter(Camara.nombre == nombre).first()
    if camara is None:
        raise HTTPException(status_code=404, detail="Camara no encontrada")
    if not camara.habilitada:
        raise HTTPException(status_code=409, detail="La camara esta apagada")

    fps = max(1, min(fps, 10))
    alto = max(120, min(alto, 1080))

    try:
        generador = FramesClient().mjpeg(nombre, fps, alto)
        tipo = next(generador)
    except FramesError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("frames: fallo al leer la camara %s", nombre)
        raise HTTPException(status_code=502, detail="No se pudo leer la camara") from exc

    return StreamingResponse(generador, media_type=tipo)


@router.get("/preview", response_model=PreviewResponse)
async def preview(db: Session = Depends(get_db)):
    configuracion = _construir(db)
    texto = frames_config.como_yaml(configuracion)
    visible = frames_config.enmascarar_rtsp(texto)
    try:
        valido, detalle = FramesClient().validar_config(texto)
    except FramesError as exc:
        return PreviewResponse(
            configuracion=visible, valido=False, detalle=frames_config.enmascarar_rtsp(str(exc))
        )
    return PreviewResponse(
        configuracion=visible, valido=valido, detalle=frames_config.enmascarar_rtsp(detalle)
    )


@router.post("/aplicar", response_model=AplicarResponse, dependencies=_gestionar)
async def aplicar(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    configuracion = _construir(db)
    if not configuracion["cameras"]:
        raise HTTPException(
            status_code=400,
            detail="No hay camaras habilitadas: aplicar dejaria a frames sin grabar",
        )

    texto = frames_config.como_yaml(configuracion)
    try:
        cliente = FramesClient()
        valido, detalle = cliente.validar_config(texto)
        if not valido:
            raise HTTPException(
                status_code=400,
                detail=frames_config.enmascarar_rtsp(detalle) or "Configuracion invalida",
            )
        cliente.guardar_config(texto, aplicar=True)
    except FramesError as exc:
        raise HTTPException(
            status_code=502, detail=frames_config.enmascarar_rtsp(str(exc))
        ) from exc

    return AplicarResponse(
        aplicado=True,
        reiniciado=True,
        detalle="frames reinicio para aplicar la configuracion",
    )
