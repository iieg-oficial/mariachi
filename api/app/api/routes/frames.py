from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import verify_csrf
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

router = APIRouter(prefix="/frames", tags=["frames"])


def _camara(db: Session, camara_id: int) -> Camara:
    camara = db.query(Camara).filter(Camara.id == camara_id).first()
    if camara is None:
        raise HTTPException(status_code=404, detail="Camara no encontrada")
    return camara


@router.get("/camaras", response_model=list[CamaraResponse])
async def listar(db: Session = Depends(get_db)):
    return db.query(Camara).order_by(Camara.orden, Camara.nombre).all()


@router.post("/camaras", response_model=CamaraResponse, status_code=201)
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


@router.put("/camaras/{camara_id}", response_model=CamaraResponse)
async def actualizar(
    camara_id: int,
    payload: CamaraUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    camara = _camara(db, camara_id)
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(camara, campo, valor)
    db.commit()
    db.refresh(camara)
    return camara


@router.delete("/camaras/{camara_id}", status_code=204)
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
    except Exception as exc:
        return EstadoResponse(
            disponible=False,
            detalle=str(exc)[:300],
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
        raise HTTPException(status_code=502, detail=str(exc)[:200]) from exc

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
        raise HTTPException(status_code=502, detail=str(exc)[:200]) from exc

    return StreamingResponse(generador, media_type=tipo)


@router.get("/preview", response_model=PreviewResponse)
async def preview(db: Session = Depends(get_db)):
    configuracion = frames_config.construir(db)
    texto = frames_config.como_yaml(configuracion)
    try:
        valido, detalle = FramesClient().validar_config(texto)
    except FramesError as exc:
        return PreviewResponse(configuracion=texto, valido=False, detalle=str(exc))
    return PreviewResponse(configuracion=texto, valido=valido, detalle=detalle)


@router.post("/aplicar", response_model=AplicarResponse)
async def aplicar(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    configuracion = frames_config.construir(db)
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
            raise HTTPException(status_code=400, detail=detalle or "Configuracion invalida")
        cliente.guardar_config(texto, aplicar=True)
    except FramesError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return AplicarResponse(
        aplicado=True,
        reiniciado=True,
        detalle="frames reinicio para aplicar la configuracion",
    )
