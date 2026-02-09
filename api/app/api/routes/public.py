from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.font import Font
from app.models.layout import Layout
from app.models.menu_item import MenuItem
from app.models.style import Style
from app.schemas.font import FontListItem
from app.schemas.menu_item import MenuItemResponse, MenuItemTree

router = APIRouter(tags=["portal público"])


def construir_arbol_menu(items: list[MenuItem]) -> list[MenuItemTree]:
    item_map = {}
    root_items = []

    items_visibles = sorted(
        [item for item in items if item.visible],
        key=lambda x: x.order
    )

    for item in items_visibles:
        item_dict = MenuItemResponse.model_validate(item).model_dump()
        item_map[item.id] = MenuItemTree(**item_dict, children=[])

    for item in items_visibles:
        tree_item = item_map[item.id]
        if item.parent_id and item.parent_id in item_map:
            item_map[item.parent_id].children.append(tree_item)
        else:
            root_items.append(tree_item)

    return root_items


@router.get("/menu-items/tree", response_model=list[MenuItemTree])
async def obtener_arbol_menu(db: Session = Depends(get_db)):
    items = db.query(MenuItem).all()
    return construir_arbol_menu(items)


@router.get("/layouts/{layout_type}")
async def obtener_layout(layout_type: str, db: Session = Depends(get_db)):
    layout = db.query(Layout).filter(Layout.type == layout_type).first()
    if not layout:
        return {}
    return layout.config


@router.get("/styles")
async def obtener_estilos(db: Session = Depends(get_db)):
    estilos = db.query(Style).all()
    result = {}
    for estilo in estilos:
        result.update(estilo.config)
    return result if result else {}


@router.get("/fonts", response_model=list[FontListItem])
async def listar_fuentes(db: Session = Depends(get_db)):
    fuentes = db.query(Font).order_by(Font.family, Font.weight, Font.style).all()
    return [
        FontListItem(
            id=str(fuente.id),
            name=fuente.name,
            family=fuente.family,
            style=fuente.style,
            weight=fuente.weight,
            format=fuente.format,
            url=fuente.url,
        )
        for fuente in fuentes
    ]
