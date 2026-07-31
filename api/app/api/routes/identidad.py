from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from app.api.deps import verify_csrf
from app.core.database import get_db
from app.models.identidad import Marca, MarcaCampo, MarcaFuente
from app.models.user import Usuario
from app.schemas.identidad import (
    CamposUpdate,
    MarcaDetalle,
    MarcaResponse,
    TokenResponse,
    TokenUpdate,
)
from app.services import contraste_service, identidad_service

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


@router.get("/{codigo}", response_model=MarcaDetalle)
async def detalle(codigo: str, db: Session = Depends(get_db)):
    marca = _marca(db, codigo)
    tokens = identidad_service.tokens_de(db, marca)
    campos = {
        campo.clave: campo.valor or ""
        for campo in db.query(MarcaCampo).filter(MarcaCampo.marca_id == marca.id).all()
    }
    fuentes = (
        db.query(MarcaFuente)
        .filter(MarcaFuente.marca_id == marca.id)
        .order_by(MarcaFuente.orden)
        .all()
    )
    return {
        "marca": marca,
        "tokens": tokens,
        "campos": campos,
        "fuentes": fuentes,
        "contraste": contraste_service.evaluar(identidad_service.colores_de(tokens)),
    }


@router.put("/{codigo}/tokens/{token_id}", response_model=TokenResponse)
async def actualizar_token(
    codigo: str,
    token_id: int,
    payload: TokenUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    marca = _marca(db, codigo)
    try:
        return identidad_service.actualizar_token(
            db, marca, token_id, payload.model_dump(exclude_unset=True)
        )
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.put("/{codigo}/campos")
async def actualizar_campos(
    codigo: str,
    payload: CamposUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    marca = _marca(db, codigo)
    actualizados = identidad_service.actualizar_campos(db, marca, payload.valores)
    return {"actualizados": actualizados}


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


@router.get("/{codigo}/artefactos/{artefacto:path}", response_class=PlainTextResponse)
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
