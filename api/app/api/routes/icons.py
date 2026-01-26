from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, verify_csrf
from app.models.icon import Icon
from app.models.user import Usuario

router = APIRouter(prefix="/icons", tags=["iconos"])


class IconCreate(BaseModel):
    name: str
    svg: str


class IconUpdate(BaseModel):
    name: str | None = None
    svg: str | None = None


@router.get("")
async def listar_iconos(db: Session = Depends(get_db)):
    iconos = db.query(Icon).all()
    return [
        {"id": str(icon.id), "name": icon.name, "svg": icon.svg, "createdAt": icon.created_at.isoformat()}
        for icon in iconos
    ]


@router.get("/{icon_id}")
async def obtener_icono(icon_id: int, db: Session = Depends(get_db)):
    icono = db.query(Icon).filter(Icon.id == icon_id).first()
    if not icono:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Icono no encontrado")
    return {"id": str(icono.id), "name": icono.name, "svg": icono.svg}


@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_icono(
    icon_in: IconCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    icono_existente = db.query(Icon).filter(Icon.name == icon_in.name).first()
    if icono_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Ya existe un icono con ese nombre"
        )

    nuevo_icono = Icon(name=icon_in.name, svg=icon_in.svg)
    db.add(nuevo_icono)
    db.commit()
    db.refresh(nuevo_icono)

    return {
        "id": str(nuevo_icono.id),
        "name": nuevo_icono.name,
        "svg": nuevo_icono.svg,
        "createdAt": nuevo_icono.created_at.isoformat(),
    }


@router.put("/{icon_id}")
async def actualizar_icono(
    icon_id: int,
    icon_in: IconUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    icono = db.query(Icon).filter(Icon.id == icon_id).first()
    if not icono:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Icono no encontrado")

    update_data = icon_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(icono, field, value)

    db.commit()
    db.refresh(icono)
    return {"id": str(icono.id), "name": icono.name, "svg": icono.svg}


@router.delete("/{icon_id}")
async def eliminar_icono(
    icon_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    icono = db.query(Icon).filter(Icon.id == icon_id).first()
    if not icono:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Icono no encontrado")

    db.delete(icono)
    db.commit()
    return {"message": "Icono eliminado exitosamente"}
