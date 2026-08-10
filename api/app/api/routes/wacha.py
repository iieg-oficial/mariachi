from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import verify_csrf
from app.core.database import get_db
from app.models.user import Usuario
from app.models.wacha import Camara
from app.schemas.wacha import (
    AplicarResponse,
    CamaraCreate,
    CamaraResponse,
    CamaraUpdate,
    EstadoResponse,
    PreviewResponse,
)
from app.services import wacha_config
from app.services.wacha_client import WachaClient, WachaError

router = APIRouter(prefix="/wacha", tags=["wacha"])


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
    en_mariachi = [c.nombre for c in wacha_config.camaras_activas(db)]
    try:
        cliente = WachaClient()
        version = cliente.version()
        en_wacha = cliente.camaras()
    except Exception as exc:
        return EstadoResponse(
            disponible=False,
            detalle=str(exc)[:300],
            camaras_en_mariachi=len(en_mariachi),
        )

    return EstadoResponse(
        disponible=True,
        version=version,
        camaras_en_wacha=en_wacha,
        camaras_en_mariachi=len(en_mariachi),
        sincronizado=sorted(en_wacha) == sorted(en_mariachi),
    )


@router.get("/estado-camaras")
async def estado_camaras():
    try:
        return WachaClient().estado_camaras()
    except WachaError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


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
        generador = WachaClient().mjpeg(nombre, fps, alto)
        tipo = next(generador)
    except WachaError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:200]) from exc

    return StreamingResponse(generador, media_type=tipo)


@router.get("/preview", response_model=PreviewResponse)
async def preview(db: Session = Depends(get_db)):
    configuracion = wacha_config.construir(db)
    texto = wacha_config.como_yaml(configuracion)
    try:
        valido, detalle = WachaClient().validar_config(texto)
    except WachaError as exc:
        return PreviewResponse(configuracion=texto, valido=False, detalle=str(exc))
    return PreviewResponse(configuracion=texto, valido=valido, detalle=detalle)


@router.post("/aplicar", response_model=AplicarResponse)
async def aplicar(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    configuracion = wacha_config.construir(db)
    if not configuracion["cameras"]:
        raise HTTPException(
            status_code=400,
            detail="No hay camaras habilitadas: aplicar dejaria a wacha sin grabar",
        )

    texto = wacha_config.como_yaml(configuracion)
    try:
        cliente = WachaClient()
        valido, detalle = cliente.validar_config(texto)
        if not valido:
            raise HTTPException(status_code=400, detail=detalle or "Configuracion invalida")
        cliente.guardar_config(texto, aplicar=True)
    except WachaError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return AplicarResponse(
        aplicado=True,
        reiniciado=True,
        detalle="wacha reinicio para aplicar la configuracion",
    )
