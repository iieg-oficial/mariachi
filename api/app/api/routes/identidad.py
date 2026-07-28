from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.identidad import Marca
from app.schemas.identidad import MarcaResponse
from app.services import identidad_service

router = APIRouter(prefix="/identidad", tags=["identidad"])

TIPOS = {
    "design.md": "text/markdown; charset=utf-8",
    "theme.css": "text/css; charset=utf-8",
    "tokens.css": "text/css; charset=utf-8",
    "fonts.css": "text/css; charset=utf-8",
}


def _marca(db: Session, codigo: str) -> Marca:
    marca = identidad_service.cargar_marca(db, codigo)
    if marca is None:
        raise HTTPException(status_code=404, detail=f"Marca '{codigo}' no encontrada")
    return marca


@router.get("/marcas", response_model=list[MarcaResponse])
async def listar_marcas(db: Session = Depends(get_db)):
    return db.query(Marca).order_by(Marca.codigo).all()


@router.get("/{codigo}/export")
async def exportar(codigo: str, db: Session = Depends(get_db)):
    marca = _marca(db, codigo)
    contenido = identidad_service.empaquetar(
        marca, identidad_service.artefactos(db, marca)
    )
    return Response(
        content=contenido,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="identidad-{marca.codigo}.zip"'
        },
    )


@router.get("/{codigo}/{artefacto:path}", response_class=PlainTextResponse)
async def obtener_artefacto(codigo: str, artefacto: str, db: Session = Depends(get_db)):
    marca = _marca(db, codigo)
    salida = identidad_service.artefactos(db, marca)
    if artefacto not in salida:
        raise HTTPException(
            status_code=404,
            detail=f"Artefacto '{artefacto}' no disponible. Opciones: {sorted(salida)}",
        )
    media_type = TIPOS.get(artefacto, "application/json; charset=utf-8")
    return PlainTextResponse(content=salida[artefacto], media_type=media_type)
