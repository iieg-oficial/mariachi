"""Generación de miniaturas on-the-fly para imágenes del Acervo.

Las miniaturas se generan bajo demanda (endpoint `/acervo/thumb/...`) y se
cachean en el propio SeaweedFS bajo un prefijo oculto `.thumbs/`. El ETag del
original se embebe en el nombre del objeto cacheado, de modo que la caché es
inmutable y auto-invalidante: si el original cambia, su ETag cambia, la ruta
cambia y la miniatura se regenera (las viejas quedan bajo el mismo prefijo del
objeto y se limpian al borrar/mover).

Solo se rasteriza imagen raster (PNG/JPEG/GIF/WebP). El SVG se sirve tal cual
(vectorial) y no pasa por aquí.
"""

from __future__ import annotations

import io
import logging

from PIL import Image

logger = logging.getLogger(__name__)

THUMB_PREFIX = ".thumbs/"
ALLOWED_WIDTHS = (120, 400, 1280)
DEFAULT_WIDTH = 400
WEBP_QUALITY = 80

MAX_OPEN_PIXELS = 200_000_000
MAX_FULL_DECODE_PIXELS = 128_000_000

Image.MAX_IMAGE_PIXELS = MAX_OPEN_PIXELS // 2

RASTER_MIME = frozenset({
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
})


def is_raster_image(content_type: str | None) -> bool:
    return bool(content_type) and content_type.lower() in RASTER_MIME


def normalize_width(width: int) -> int:
    """Acota el ancho solicitado al set permitido (evita variantes ilimitadas)."""
    for allowed in ALLOWED_WIDTHS:
        if width <= allowed:
            return allowed
    return ALLOWED_WIDTHS[-1]


def _clean_etag(etag: str | None) -> str:
    return (etag or "").strip('"') or "noetag"


def thumb_dir(object_name: str) -> str:
    return f"{THUMB_PREFIX}{object_name}/"


def thumb_key(object_name: str, etag: str | None, width: int) -> str:
    return f"{thumb_dir(object_name)}{_clean_etag(etag)}-w{width}.webp"


def cleanup(client, object_name: str) -> None:
    """Borra (best-effort) todas las variantes cacheadas de un objeto."""
    try:
        client.delete_prefix(thumb_dir(object_name))
    except Exception:
        logger.warning("acervo.thumb.cleanup falló para object=%s", object_name)


def cleanup_prefix(client, folder_prefix: str) -> None:
    """Borra (best-effort) las miniaturas de todos los objetos bajo una carpeta."""
    if not folder_prefix:
        return
    try:
        client.delete_prefix(f"{THUMB_PREFIX}{folder_prefix}")
    except Exception:
        logger.warning("acervo.thumb.cleanup_prefix falló para prefix=%s", folder_prefix)


def generate_webp(data: bytes, width: int) -> bytes:
    with Image.open(io.BytesIO(data)) as img:
        if img.format == "JPEG":
            img.draft("RGB", (width, width))
        elif img.width * img.height > MAX_FULL_DECODE_PIXELS:
            raise Image.DecompressionBombError(
                f"{img.width}x{img.height} excede {MAX_FULL_DECODE_PIXELS} px sin decodificación reducida"
            )
        has_alpha = img.mode in ("RGBA", "LA") or (
            img.mode == "P" and "transparency" in img.info
        )
        img = img.convert("RGBA" if has_alpha else "RGB")
        # `thumbnail` solo reduce y preserva el aspect ratio.
        img.thumbnail((width, width))
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=WEBP_QUALITY, method=4)
        return out.getvalue()
