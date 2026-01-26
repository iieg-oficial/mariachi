from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, verify_csrf
from app.models.layout import Layout
from app.models.user import Usuario

router = APIRouter(prefix="/layouts", tags=["layouts"])


@router.get("")
async def obtener_layouts(db: Session = Depends(get_db)):
    layouts = db.query(Layout).all()
    return {layout.type: layout.config for layout in layouts}


@router.get("/{layout_type}")
async def obtener_layout(layout_type: str, db: Session = Depends(get_db)):
    layout = db.query(Layout).filter(Layout.type == layout_type).first()
    if not layout:
        return {}
    return layout.config


@router.put("/{layout_type}")
async def actualizar_layout(
    layout_type: str,
    config: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    layout = db.query(Layout).filter(Layout.type == layout_type).first()

    if not layout:
        layout = Layout(type=layout_type, config=config)
        db.add(layout)
    else:
        layout.config = config

    db.commit()
    db.refresh(layout)
    return layout.config
