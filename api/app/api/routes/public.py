from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.menu_item import MenuItem
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
