from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from app.api.deps import verify_csrf
from app.core.database import get_db
from app.models.mel import Marca, MarcaCampo, MarcaFuente
from app.models.user import Usuario
from app.schemas.mel import (
    CamposUpdate,
    MarcaDetalle,
    MarcaResponse,
    TokenResponse,
    TokenUpdate,
)
from app.services import contraste_service, mel_service

_rutas = APIRouter()

TIPOS = {
    "design.md": "text/markdown; charset=utf-8",
    "theme.css": "text/css; charset=utf-8",
    "tokens.css": "text/css; charset=utf-8",
    "fonts.css": "text/css; charset=utf-8",
    "tokens.qss": "text/plain; charset=utf-8",
}


def _marca(db: Session, codigo: str) -> Marca:
    marca = mel_service.cargar_marca(db, codigo)
    if marca is None:
        raise HTTPException(status_code=404, detail=f"Marca '{codigo}' no encontrada")
    return marca


@_rutas.get("/marcas", response_model=list[MarcaResponse])
async def listar_marcas(db: Session = Depends(get_db)):
    return db.query(Marca).order_by(Marca.codigo).all()


@_rutas.get("/{codigo}", response_model=MarcaDetalle)
async def detalle(codigo: str, db: Session = Depends(get_db)):
    marca = _marca(db, codigo)
    tokens = mel_service.tokens_de(db, marca)
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
        "contraste": contraste_service.evaluar(mel_service.colores_de(tokens)),
    }


@_rutas.put("/{codigo}/tokens/{token_id}", response_model=TokenResponse)
async def actualizar_token(
    codigo: str,
    token_id: int,
    payload: TokenUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    marca = _marca(db, codigo)
    try:
        return mel_service.actualizar_token(
            db, marca, token_id, payload.model_dump(exclude_unset=True)
        )
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@_rutas.put("/{codigo}/campos")
async def actualizar_campos(
    codigo: str,
    payload: CamposUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    marca = _marca(db, codigo)
    actualizados = mel_service.actualizar_campos(db, marca, payload.valores)
    return {"actualizados": actualizados}


@_rutas.get("/{codigo}/export")
async def exportar(codigo: str, db: Session = Depends(get_db)):
    marca = _marca(db, codigo)
    contenido = mel_service.empaquetar(
        marca, mel_service.artefactos(db, marca)
    )
    return Response(
        content=contenido,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="mel-{marca.codigo}.zip"'
        },
    )


@_rutas.get("/{codigo}/artefactos/{artefacto:path}", response_class=PlainTextResponse)
async def obtener_artefacto(codigo: str, artefacto: str, db: Session = Depends(get_db)):
    marca = _marca(db, codigo)
    salida = mel_service.artefactos(db, marca)
    if artefacto not in salida:
        raise HTTPException(
            status_code=404,
            detail=f"Artefacto '{artefacto}' no disponible. Opciones: {sorted(salida)}",
        )
    media_type = TIPOS.get(artefacto, "application/json; charset=utf-8")
    return PlainTextResponse(content=salida[artefacto], media_type=media_type)


router = APIRouter(prefix="/mel", tags=["mel"])
router.include_router(_rutas)

router_compat = APIRouter(prefix="/identidad", tags=["mel"], deprecated=True)
router_compat.include_router(_rutas)
