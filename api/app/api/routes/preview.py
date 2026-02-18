from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import verify_csrf
from app.core.cache import get_cache, set_cache

admin_router = APIRouter(prefix="/preview", tags=["preview"])
public_router = APIRouter(prefix="/preview", tags=["preview"])


class PreviewBody(BaseModel):
    sections: list[dict]
    title: str
    slug: str


class MenuPreviewBody(BaseModel):
    items: list[dict]


def _build_menu_tree(flat_items: list[dict]) -> list[dict]:
    visible = sorted(
        [i for i in flat_items if i.get('visible', True)],
        key=lambda x: x.get('order', 0)
    )
    item_map = {str(i['id']): {**i, 'children': []} for i in visible}
    root = []
    for item in visible:
        node = item_map[str(item['id'])]
        pid = str(item.get('parentId') or item.get('parent_id') or '')
        if pid and pid in item_map:
            item_map[pid]['children'].append(node)
        else:
            root.append(node)
    return root


@admin_router.post("/paginas/{page_id}")
async def crear_preview(
    page_id: str,
    body: PreviewBody,
    current_user=Depends(verify_csrf),
):
    token = str(uuid4())
    set_cache(f"preview:{token}", {"sections": body.sections, "title": body.title, "slug": body.slug}, expire=3600)
    return {"token": token}


@admin_router.post("/menu")
async def crear_preview_menu(
    body: MenuPreviewBody,
    current_user=Depends(verify_csrf),
):
    token = str(uuid4())
    tree = _build_menu_tree(body.items)
    set_cache(f"preview-menu:{token}", {"items": tree}, expire=3600)
    return {"token": token}


@public_router.get("/menu/{token}")
async def obtener_preview_menu(token: str):
    data = get_cache(f"preview-menu:{token}")
    if not data:
        raise HTTPException(status_code=404, detail="Vista previa no encontrada o expirada")
    return data


@public_router.get("/{token}")
async def obtener_preview(token: str):
    data = get_cache(f"preview:{token}")
    if not data:
        raise HTTPException(status_code=404, detail="Vista previa no encontrada o expirada")
    return data
