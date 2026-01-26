from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, verify_csrf
from app.models.page import Page
from app.models.user import Usuario
from app.schemas.page import PageCreate, PageResponse, PageUpdate

router = APIRouter(prefix="/pages", tags=["páginas"])


@router.get("", response_model=list[PageResponse])
async def listar_paginas(db: Session = Depends(get_db)):
    paginas = db.query(Page).all()
    return paginas


@router.get("/{page_id}", response_model=PageResponse)
async def obtener_pagina(page_id: str, db: Session = Depends(get_db)):
    pagina = db.query(Page).filter(Page.menu_item_id == page_id).first()

    if not pagina:
        return PageResponse(
            id=0,
            menu_item_id=page_id,
            title="",
            slug="",
            sections=[],
            meta_description=None,
            meta_keywords=None,
            published_at=None,
            updated_at=datetime.utcnow(),
        )

    return pagina


@router.put("/{page_id}", response_model=PageResponse)
async def actualizar_o_crear_pagina(
    page_id: str,
    page_in: PageUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    pagina = db.query(Page).filter(Page.menu_item_id == page_id).first()

    if not pagina:
        nueva_pagina = Page(
            menu_item_id=page_id,
            **page_in.model_dump(exclude_unset=True),
            published_at=datetime.utcnow(),
        )
        db.add(nueva_pagina)
        db.commit()
        db.refresh(nueva_pagina)
        return nueva_pagina

    update_data = page_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pagina, field, value)

    pagina.published_at = datetime.utcnow()
    pagina.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(pagina)
    return pagina


@router.delete("/{page_id}")
async def eliminar_pagina(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    pagina = db.query(Page).filter(Page.menu_item_id == page_id).first()
    if not pagina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Página no encontrada"
        )

    db.delete(pagina)
    db.commit()
    return {"message": "Página eliminada exitosamente"}
