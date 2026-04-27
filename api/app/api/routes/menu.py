from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_project_access, verify_csrf
from app.models.menu_item import MenuItem
from app.models.user import Usuario
from app.schemas.menu_item import MenuItemCreate, MenuItemResponse, MenuItemTree, MenuItemUpdate
from app.services.menu_tree import build_menu_tree

router = APIRouter(
    prefix="/elementos-menu",
    tags=["menú"],
    dependencies=[Depends(require_project_access("portal"))],
)

_require_editor = require_project_access("portal", min_role="editor")


@router.get("", response_model=list[MenuItemResponse])
async def listar_menu_items(db: Session = Depends(get_db)):
    items = db.query(MenuItem).all()
    return items


@router.get("/arbol", response_model=list[MenuItemTree])
async def obtener_arbol_menu(db: Session = Depends(get_db)):
    items = db.query(MenuItem).all()
    return build_menu_tree(items)


@router.get("/{item_id}", response_model=MenuItemResponse)
async def obtener_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado"
        )
    return item


@router.post("", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
async def crear_menu_item(
    item_in: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    nuevo_item = MenuItem(**item_in.model_dump())
    db.add(nuevo_item)
    db.commit()
    db.refresh(nuevo_item)
    return nuevo_item


@router.put("/{item_id}", response_model=MenuItemResponse)
async def actualizar_menu_item(
    item_id: int,
    item_in: MenuItemUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado"
        )

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
async def eliminar_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado"
        )

    db.delete(item)
    db.commit()
    return {"message": "Item eliminado exitosamente"}
