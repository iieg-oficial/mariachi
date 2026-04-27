from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import get_current_user, get_db, require_project_access, verify_csrf
from app.core.optimistic import check_concurrent_edit
from app.core.time import utcnow
from app.models.menu_item import MenuItem
from app.models.page import Page
from app.models.user import Usuario
from app.schemas.page import PageResponse, PageUpdate
from app.services import presence

router = APIRouter(
    prefix="/paginas",
    tags=["páginas"],
    dependencies=[Depends(require_project_access("portal"))],
)

_require_editor = require_project_access("portal", min_role="editor")


def _slug_from_menu_item(page_id: str, db: Session) -> tuple[str, str]:
    try:
        menu_item = db.query(MenuItem).filter(MenuItem.id == int(page_id)).first()
        if menu_item:
            slug = menu_item.url.strip('/')
            slug = slug if slug else 'home'
            return slug, menu_item.label
    except (ValueError, AttributeError):
        pass
    return f"pagina-{page_id}", "Nueva Página"


@router.get("", response_model=list[PageResponse])
async def listar_paginas(db: Session = Depends(get_db)):
    paginas = db.query(Page).all()
    return paginas


@router.get("/{page_id}", response_model=PageResponse)
async def obtener_pagina(page_id: str, db: Session = Depends(get_db)):
    pagina = db.query(Page).filter(Page.menu_item_id == page_id).first()

    if not pagina:
        slug, title = _slug_from_menu_item(page_id, db)
        return PageResponse(
            id=0,
            menu_item_id=page_id,
            title=title,
            slug=slug,
            sections=[],
            meta_description=None,
            meta_keywords=None,
            published_at=None,
            updated_at=utcnow(),
        )

    return pagina


@router.put("/{page_id}/presencia")
async def registrar_presencia(
    page_id: str,
    current_user: Usuario = Depends(get_current_user),
):
    presence.register("pagina", page_id, current_user.username, current_user.name)
    return {"ok": True}


@router.get("/{page_id}/presencia")
async def obtener_presencia(
    page_id: str,
    current_user: Usuario = Depends(get_current_user),
):
    return presence.list_others("pagina", page_id, current_user.username)


@router.put("/{page_id}", response_model=PageResponse)
async def actualizar_o_crear_pagina(
    page_id: str,
    page_in: PageUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    pagina = db.query(Page).filter(Page.menu_item_id == page_id).first()

    if pagina:
        check_concurrent_edit(
            pagina.updated_at,
            page_in.expected_updated_at,
            detail="La página fue modificada por otro usuario",
        )

    if not pagina:
        data = page_in.model_dump(exclude_unset=True, exclude={'expected_updated_at'})
        if not data.get('slug'):
            data['slug'], _ = _slug_from_menu_item(page_id, db)
        nueva_pagina = Page(
            menu_item_id=page_id,
            **data,
            published_at=utcnow(),
        )
        db.add(nueva_pagina)
        db.commit()
        db.refresh(nueva_pagina)
        pagina = nueva_pagina
    else:
        update_data = page_in.model_dump(exclude_unset=True, exclude={'expected_updated_at'})
        for field, value in update_data.items():
            setattr(pagina, field, value)
        if 'sections' in update_data:
            flag_modified(pagina, 'sections')

        pagina.published_at = utcnow()
        pagina.updated_at = utcnow()
        db.commit()
        db.refresh(pagina)

    return pagina


@router.delete("/{page_id}")
async def eliminar_pagina(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    pagina = db.query(Page).filter(Page.menu_item_id == page_id).first()
    if not pagina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Página no encontrada"
        )

    db.delete(pagina)
    db.commit()
    return {"message": "Página eliminada exitosamente"}

@router.get("/por-slug/{slug:path}", response_model=PageResponse)
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
                published_at=utcnow(),
                updated_at=utcnow(),
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
