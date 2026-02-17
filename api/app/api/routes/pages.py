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
            title="Nueva Página",
            slug="nueva-pagina",
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
        pagina = nueva_pagina
    else:
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

@router.get("/slug/{slug}", response_model=PageResponse)
def obtener_pagina_por_slug(slug: str, db: Session = Depends(get_db)):
    """
    Obtiene la configuración de una página por su slug.
    Si no existe, retorna 404.
    """
    pagina = db.query(Page).filter(Page.slug == slug).first()
    
    if not pagina:
        # Para 'home', podemos devolver una estructura default si no existe en DB
        if slug == 'home':
             return PageResponse(
                id=0,
                menu_item_id=0,
                title="Inicio",
                slug="home",
                sections=[],
                meta_description="Página de Inicio",
                meta_keywords="",
                published_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
        raise HTTPException(status_code=404, detail="Página no encontrada")

    return PageResponse(
        id=pagina.id,
        menu_item_id=pagina.menu_item_id,
        title=pagina.title,
        slug=pagina.slug,
        sections=pagina.sections if pagina.sections else [],
        meta_description=pagina.meta_description,
        meta_keywords=pagina.meta_keywords,
        published_at=pagina.published_at,
        updated_at=pagina.updated_at,
    )
