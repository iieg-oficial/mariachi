from app.models.menu_item import MenuItem
from app.schemas.menu_item import MenuItemResponse, MenuItemTree


def build_menu_tree(items: list[MenuItem]) -> list[MenuItemTree]:
    items_visibles = sorted(
        [item for item in items if item.visible],
        key=lambda x: x.order,
    )

    item_map: dict[int, MenuItemTree] = {}
    for item in items_visibles:
        item_dict = MenuItemResponse.model_validate(item).model_dump()
        item_map[item.id] = MenuItemTree(**item_dict, children=[])

    root_items: list[MenuItemTree] = []
    for item in items_visibles:
        tree_item = item_map[item.id]
        if item.parent_id and item.parent_id in item_map:
            item_map[item.parent_id].children.append(tree_item)
        else:
            root_items.append(tree_item)

    return root_items
