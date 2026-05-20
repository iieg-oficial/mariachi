from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, verify_csrf
from app.api.rate_limit import rate_limit
from app.core.database import get_dataengine_db
from app.models.user import Usuario
from app.schemas.symbol import (
    SymbolCatalogCategory,
    SymbolCatalogResponse,
    SymbolCategoryCreate,
    SymbolCategoryResponse,
    SymbolCategoryUpdate,
    SymbolCreate,
    SymbolReorderRequest,
    SymbolResponse,
    SymbolUpdate,
)
from app.services import symbol_service

router = APIRouter(
    prefix="/mapalab",
    tags=["mapalab-symbols"],
)

mapalab_router = APIRouter(tags=["mapalab-symbols público"])

_require_admin = require_role(["tetlamamakani"])
_write_rate_limit = rate_limit(max_requests=120, window_seconds=60.0)


@router.get("/symbol-categories", response_model=list[SymbolCategoryResponse])
async def list_categories(
    db: Session = Depends(get_dataengine_db),
    _admin: Usuario = Depends(_require_admin),
):
    return symbol_service.list_categories(db)


@router.post(
    "/symbol-categories",
    response_model=SymbolCategoryResponse,
    status_code=201,
)
async def create_category(
    payload: SymbolCategoryCreate,
    db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    return symbol_service.create_category(db, payload)


@router.put(
    "/symbol-categories/{category_id}",
    response_model=SymbolCategoryResponse,
)
async def update_category(
    category_id: int,
    payload: SymbolCategoryUpdate,
    db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    return symbol_service.update_category(db, category_id, payload)


@router.delete("/symbol-categories/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_dataengine_db),
    mariachi_db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    symbol_service.delete_category(db, category_id, mariachi_db=mariachi_db)


@router.get("/symbols", response_model=list[SymbolResponse])
async def list_symbols(
    category_id: int | None = None,
    db: Session = Depends(get_dataengine_db),
    mariachi_db: Session = Depends(get_db),
    _admin: Usuario = Depends(_require_admin),
):
    items = symbol_service.list_symbols(db, category_id=category_id)
    return [symbol_service.to_response(s, mariachi_db) for s in items]


@router.post("/symbols", response_model=SymbolResponse, status_code=201)
async def create_symbol(
    payload: SymbolCreate,
    db: Session = Depends(get_dataengine_db),
    mariachi_db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    symbol = symbol_service.create_symbol_from_payload(db, payload)
    return symbol_service.to_response(symbol, mariachi_db)


@router.post("/symbols/upload", response_model=SymbolResponse, status_code=201)
async def upload_file_symbol(
    file: UploadFile = File(...),
    category_id: int = Form(...),
    name: str | None = Form(default=None),
    sort_order: int = Form(default=0),
    kind: str = Form(default="image"),
    db: Session = Depends(get_dataengine_db),
    mariachi_db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    if kind == "svg":
        symbol = symbol_service.create_svg_symbol(
            db,
            file=file,
            category_id=category_id,
            name=name,
            sort_order=sort_order,
            mariachi_db=mariachi_db,
        )
    elif kind == "image":
        symbol = symbol_service.create_image_symbol(
            db,
            file=file,
            category_id=category_id,
            name=name,
            sort_order=sort_order,
            mariachi_db=mariachi_db,
        )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"kind='{kind}' no soportado en upload; usa 'image' o 'svg'",
        )
    return symbol_service.to_response(symbol, mariachi_db)


@router.put("/symbols/{symbol_id}", response_model=SymbolResponse)
async def update_symbol(
    symbol_id: int,
    payload: SymbolUpdate,
    db: Session = Depends(get_dataengine_db),
    mariachi_db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    symbol = symbol_service.update_symbol(db, symbol_id, payload)
    return symbol_service.to_response(symbol, mariachi_db)


@router.delete("/symbols/{symbol_id}", status_code=204)
async def delete_symbol(
    symbol_id: int,
    db: Session = Depends(get_dataengine_db),
    mariachi_db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    symbol_service.delete_symbol(db, symbol_id, mariachi_db=mariachi_db)


@router.post("/symbols/reorder", status_code=204)
async def reorder_symbols(
    payload: SymbolReorderRequest,
    db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    symbol_service.reorder_symbols(db, [(i.id, i.sort_order) for i in payload.items])


@mapalab_router.get("/symbols/catalog", response_model=SymbolCatalogResponse)
async def public_catalog(
    db: Session = Depends(get_dataengine_db),
    mariachi_db: Session = Depends(get_db),
):
    categories: list[SymbolCatalogCategory] = symbol_service.build_catalog(db, mariachi_db)
    return SymbolCatalogResponse(categories=categories)
