from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, verify_csrf
from app.models.style import Style
from app.models.user import Usuario

router = APIRouter(prefix="/styles", tags=["estilos"])


@router.get("")
async def obtener_estilos(db: Session = Depends(get_db)):
    estilos = db.query(Style).all()
    result = {}
    for estilo in estilos:
        result.update(estilo.config)
    return result if result else {}


@router.put("")
async def actualizar_estilos(
    config: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    estilo = db.query(Style).filter(Style.key == "global").first()

    if not estilo:
        estilo = Style(key="global", config=config)
        db.add(estilo)
    else:
        estilo.config = config

    db.commit()
    db.refresh(estilo)
    return estilo.config
