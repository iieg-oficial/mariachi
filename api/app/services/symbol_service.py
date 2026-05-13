from __future__ import annotations

import io
import logging
import os
import uuid
from pathlib import Path

import httpx
from fastapi import HTTPException, UploadFile, status
from minio.error import S3Error
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.media_bucket import MediaBucket
from app.models.symbol import Symbol, SymbolCategory
from app.schemas.symbol import (
    SymbolCatalogCategory,
    SymbolCategoryCreate,
    SymbolCategoryUpdate,
    SymbolCreate,
    SymbolResponse,
    SymbolUpdate,
)
from app.services.acervo import AcervoClient

logger = logging.getLogger(__name__)

MAPALAB_BUCKET_SLUG = "mapalab"
IMAGE_PREFIX = "simbologia/"
EMOJI_PNG_PREFIX = "simbologia/emoji-png/"
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "svg", "webp", "gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024
TWEMOJI_BASE_URL = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72"


def _mapalab_bucket(mariachi_db: Session) -> MediaBucket:
    bucket = (
        mariachi_db.query(MediaBucket)
        .filter(MediaBucket.acervo_bucket == MAPALAB_BUCKET_SLUG)
        .first()
    )
    if not bucket:
        raise RuntimeError(
            f"MediaBucket '{MAPALAB_BUCKET_SLUG}' no registrado en mariachi. "
            "Verifica que la migracion c0d1e2f3a4b5 haya corrido."
        )
    return bucket


def _acervo_client(mariachi_db: Session) -> AcervoClient:
    return AcervoClient.for_bucket(_mapalab_bucket(mariachi_db))


def list_categories(db: Session) -> list[SymbolCategory]:
    return (
        db.query(SymbolCategory)
        .order_by(SymbolCategory.sort_order, SymbolCategory.name)
        .all()
    )


def get_category(db: Session, category_id: int) -> SymbolCategory:
    category = db.get(SymbolCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria de simbolos no encontrada")
    return category


def create_category(db: Session, payload: SymbolCategoryCreate) -> SymbolCategory:
    entity = SymbolCategory(
        slug=payload.slug,
        name=payload.name,
        icon=payload.icon,
        sort_order=payload.sort_order,
    )
    db.add(entity)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"slug '{payload.slug}' ya existe",
        ) from exc
    db.refresh(entity)
    return entity


def update_category(
    db: Session, category_id: int, payload: SymbolCategoryUpdate
) -> SymbolCategory:
    entity = get_category(db, category_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(entity, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="slug duplicado",
        ) from exc
    db.refresh(entity)
    return entity


def delete_category(db: Session, category_id: int, mariachi_db: Session) -> None:
    entity = get_category(db, category_id)
    keys_to_remove = [
        key
        for sym in entity.symbols
        for key in (sym.image_object_key, sym.png_object_key)
        if key
    ]
    db.delete(entity)
    db.commit()
    if keys_to_remove:
        client = _acervo_client(mariachi_db)
        for key in keys_to_remove:
            client.delete_file(key)


def list_symbols(db: Session, category_id: int | None = None) -> list[Symbol]:
    q = db.query(Symbol)
    if category_id is not None:
        q = q.filter(Symbol.category_id == category_id)
    return q.order_by(Symbol.category_id, Symbol.sort_order, Symbol.id).all()


def get_symbol(db: Session, symbol_id: int) -> Symbol:
    symbol = db.get(Symbol, symbol_id)
    if not symbol:
        raise HTTPException(status_code=404, detail="Simbolo no encontrado")
    return symbol


def create_symbol_from_payload(db: Session, payload: SymbolCreate) -> Symbol:
    if payload.kind == "image":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="kind=image se crea con el endpoint multipart de upload",
        )
    get_category(db, payload.category_id)
    entity = Symbol(
        category_id=payload.category_id,
        kind=payload.kind,
        value=payload.value,
        name=payload.name,
        sort_order=payload.sort_order,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def create_image_symbol(
    db: Session,
    *,
    file: UploadFile,
    category_id: int,
    name: str | None,
    sort_order: int,
    mariachi_db: Session,
) -> Symbol:
    get_category(db, category_id)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Archivo sin nombre")

    extension = Path(file.filename).suffix.lower().lstrip(".") or "bin"
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extension '{extension}' no permitida. Aceptadas: {sorted(ALLOWED_IMAGE_EXTENSIONS)}",
        )

    stream = file.file
    stream.seek(0, os.SEEK_END)
    size = stream.tell()
    stream.seek(0)
    if size <= 0:
        raise HTTPException(status_code=400, detail="Archivo vacio")
    if size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Archivo excede el limite ({MAX_IMAGE_SIZE} bytes)",
        )

    object_key = f"{IMAGE_PREFIX}{uuid.uuid4().hex}.{extension}"
    client = _acervo_client(mariachi_db)
    try:
        client.client.put_object(
            client.bucket_name,
            object_key,
            stream,
            size,
            content_type=file.content_type or "application/octet-stream",
        )
    except S3Error as exc:
        logger.exception("symbol_service.upload_image bucket=%s", client.bucket_name)
        raise HTTPException(
            status_code=502,
            detail=f"Error subiendo imagen a Acervo: {exc.code}",
        ) from exc

    entity = Symbol(
        category_id=category_id,
        kind="image",
        value=None,
        name=name,
        sort_order=sort_order,
        image_object_key=object_key,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def update_symbol(db: Session, symbol_id: int, payload: SymbolUpdate) -> Symbol:
    symbol = get_symbol(db, symbol_id)
    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data:
        get_category(db, data["category_id"])

    if "value" in data and symbol.kind == "image":
        raise HTTPException(
            status_code=400,
            detail="kind=image no permite editar `value`; reemplaza la imagen creando un nuevo simbolo",
        )

    for field, value in data.items():
        setattr(symbol, field, value)

    db.commit()
    db.refresh(symbol)
    return symbol


def delete_symbol(db: Session, symbol_id: int, mariachi_db: Session) -> None:
    symbol = get_symbol(db, symbol_id)
    keys = [
        key
        for key in (symbol.image_object_key, symbol.png_object_key)
        if key
    ]
    db.delete(symbol)
    db.commit()
    if keys:
        client = _acervo_client(mariachi_db)
        for key in keys:
            client.delete_file(key)


def reorder_symbols(db: Session, items: list[tuple[int, int]]) -> None:
    if not items:
        return
    ids = [sid for sid, _ in items]
    found = {s.id: s for s in db.query(Symbol).filter(Symbol.id.in_(ids)).all()}
    missing = [sid for sid in ids if sid not in found]
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Simbolos no encontrados: {missing}",
        )
    for sid, order in items:
        found[sid].sort_order = order
    db.commit()


def to_response(symbol: Symbol, mariachi_db: Session) -> SymbolResponse:
    return SymbolResponse(
        id=symbol.id,
        category_id=symbol.category_id,
        kind=symbol.kind,
        value=symbol.value,
        name=symbol.name,
        sort_order=symbol.sort_order,
        image_url=_object_public_url(mariachi_db, symbol.image_object_key),
        png_url=_object_public_url(mariachi_db, symbol.png_object_key),
        created_at=symbol.created_at,
        updated_at=symbol.updated_at,
    )


def _object_public_url(mariachi_db: Session, object_key: str | None) -> str | None:  # noqa: ARG001
    """URL pública del objeto via gateway. No requiere credenciales del bucket;
    solo construye `{acervo_public_endpoint}/{bucket}/{key}`. El parámetro
    `mariachi_db` queda por compat con callers existentes."""
    if not object_key:
        return None
    from app.core.acervo_url import to_absolute
    return to_absolute(f"{MAPALAB_BUCKET_SLUG}/{object_key}")


def _object_geoserver_url(mariachi_db: Session, object_key: str | None) -> str | None:  # noqa: ARG001
    """URL interna del bucket Acervo accesible desde el contenedor de GeoServer.
    Necesario porque GeoServer hace fetch del PNG/SVG al renderizar el SLD y
    no entiende rutas relativas tipo /acervo/... que sí resuelve el gateway.
    No requiere credenciales — sólo el host interno del endpoint MinIO."""
    if not object_key:
        return None
    from app.core.settings import get_settings as _get_settings
    settings = _get_settings()
    scheme = "https" if settings.acervo_use_ssl else "http"
    return f"{scheme}://{settings.acervo_endpoint}/{MAPALAB_BUCKET_SLUG}/{object_key}"


def build_catalog(db: Session, mariachi_db: Session) -> list[SymbolCatalogCategory]:
    categories = list_categories(db)
    out: list[SymbolCatalogCategory] = []
    for cat in categories:
        symbols = sorted(cat.symbols, key=lambda s: (s.sort_order, s.id))
        out.append(
            SymbolCatalogCategory(
                id=cat.id,
                slug=cat.slug,
                name=cat.name,
                icon=cat.icon,
                symbols=[to_response(s, mariachi_db) for s in symbols],
            )
        )
    return out


def find_symbol_by_graphic_url(db: Session, url: str | None) -> Symbol | None:
    if not url:
        return None
    marker = f"/{MAPALAB_BUCKET_SLUG}/"
    idx = url.find(marker)
    if idx < 0:
        return None
    object_key = url[idx + len(marker):]
    return (
        db.query(Symbol)
        .filter(
            (Symbol.image_object_key == object_key) | (Symbol.png_object_key == object_key)
        )
        .first()
    )


def emoji_to_twemoji_key(emoji: str) -> str:
    return "-".join(f"{ord(c):x}" for c in emoji if c != "️")


def ensure_emoji_png(db: Session, symbol_id: int, mariachi_db: Session) -> Symbol:
    symbol = get_symbol(db, symbol_id)
    if symbol.kind != "emoji":
        raise HTTPException(
            status_code=400,
            detail="ensure_emoji_png solo aplica a kind=emoji",
        )
    if symbol.png_object_key:
        return symbol
    if not symbol.value:
        raise HTTPException(
            status_code=400,
            detail="Simbolo emoji sin `value`; no puede rasterizarse",
        )

    key = emoji_to_twemoji_key(symbol.value)
    if not key:
        raise HTTPException(
            status_code=400,
            detail="No se pudo determinar el codepoint del emoji",
        )

    candidate_keys = [key]
    if "️" not in symbol.value and "-fe0f" not in key:
        candidate_keys.append(f"{key}-fe0f")

    content: bytes | None = None
    used_key = key
    last_status: int | None = None
    for candidate in candidate_keys:
        url = f"{TWEMOJI_BASE_URL}/{candidate}.png"
        try:
            with httpx.Client(timeout=20.0, follow_redirects=True) as http:
                response = http.get(url)
            last_status = response.status_code
            if response.status_code == 200:
                content = response.content
                used_key = candidate
                break
        except httpx.HTTPError:
            continue

    if content is None:
        raise HTTPException(
            status_code=502,
            detail=(
                f"No se pudo descargar el PNG de Twemoji para '{symbol.value}' "
                f"(candidatos: {candidate_keys}, último status: {last_status})"
            ),
        )

    object_key = f"{EMOJI_PNG_PREFIX}{used_key}.png"
    client = _acervo_client(mariachi_db)
    try:
        client.client.put_object(
            client.bucket_name,
            object_key,
            io.BytesIO(content),
            len(content),
            content_type="image/png",
        )
    except S3Error as exc:
        logger.exception("symbol_service.ensure_emoji_png upload key=%s", object_key)
        raise HTTPException(
            status_code=502,
            detail=f"Error subiendo PNG a Acervo: {exc.code}",
        ) from exc

    symbol.png_object_key = object_key
    db.commit()
    db.refresh(symbol)
    return symbol
