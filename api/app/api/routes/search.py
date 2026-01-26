from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.page import Page
from app.models.user import Usuario

router = APIRouter(prefix="/search", tags=["búsqueda"])


@router.get("/content")
async def buscar_contenido(
    db: Session = Depends(get_db),
    q: str = Query(..., min_length=1),
    status: str | None = None,
    author: str | None = None,
):
    query = db.query(Page)

    if q:
        search_term = f"%{q.lower()}%"
        query = query.filter(
            or_(
                Page.title.ilike(search_term),
                Page.slug.ilike(search_term),
                Page.meta_description.ilike(search_term),
            )
        )

    results = query.all()

    return [
        {
            "id": page.id,
            "title": page.title,
            "slug": page.slug,
            "description": page.meta_description or "",
            "lastModified": page.updated_at.isoformat(),
        }
        for page in results
    ]


@router.get("/global")
async def busqueda_global(db: Session = Depends(get_db), q: str = Query(..., min_length=1)):
    if not q:
        return []

    search_term = f"%{q.lower()}%"

    paginas = db.query(Page).filter(Page.title.ilike(search_term)).limit(5).all()

    results = []

    for pagina in paginas:
        results.append(
            {
                "title": pagina.title,
                "category": "Páginas",
                "url": f"/pages/{pagina.menu_item_id}",
            }
        )

    return results


@router.get("/authors")
async def obtener_autores(db: Session = Depends(get_db)):
    usuarios = db.query(Usuario).all()
    return [usuario.name for usuario in usuarios]
