"""Tipo real de un archivo subido, derivado de sus primeros bytes.

El `Content-Type` que manda el navegador lo elige quien sube: no sirve para
decidir cómo se guarda ni cómo se sirve un objeto del Acervo.
"""

from __future__ import annotations

from fastapi import UploadFile

CABECERA_BYTES = 4096

OCTET_STREAM = "application/octet-stream"

_FIRMAS: tuple[tuple[bytes, str], ...] = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"%PDF-", "application/pdf"),
    (b"II*\x00", "image/tiff"),
    (b"MM\x00*", "image/tiff"),
    (b"\x1f\x8b", "application/gzip"),
    (b"Rar!\x1a\x07", "application/x-rar-compressed"),
    (b"7z\xbc\xaf\x27\x1c", "application/x-7z-compressed"),
    (b"SQLite format 3\x00", "application/geopackage+sqlite3"),
)

_ZIP_FIRMAS = (b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08")
_OLE_FIRMA = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"

_ZIP_POR_EXT = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "odt": "application/vnd.oasis.opendocument.text",
    "ods": "application/vnd.oasis.opendocument.spreadsheet",
    "odp": "application/vnd.oasis.opendocument.presentation",
    "kmz": "application/vnd.google-earth.kmz",
}

_OLE_POR_EXT = {
    "doc": "application/msword",
    "xls": "application/vnd.ms-excel",
    "ppt": "application/vnd.ms-powerpoint",
}

_TEXTO_POR_EXT = {
    "csv": "text/csv",
    "tsv": "text/tab-separated-values",
    "json": "application/json",
    "geojson": "application/geo+json",
    "md": "text/markdown",
}

_MARCADO_ACTIVO = (
    b"<!doctype html",
    b"<html",
    b"<head",
    b"<body",
    b"<script",
    b"<iframe",
    b"<object",
    b"<embed",
    b"<meta",
    b"<style",
    b"<a ",
    b"<img",
    b"<div",
    b"<form",
)

MIME_ACTIVOS = frozenset({
    "text/html",
    "application/xhtml+xml",
    "image/svg+xml",
    "application/xml",
    "text/xml",
    "application/javascript",
    "text/javascript",
})

MIME_RASTER = frozenset({
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
})

MIME_INLINE_SEGUROS = MIME_RASTER | {"application/pdf"}


def extension(nombre: str | None) -> str:
    if not nombre or "." not in nombre:
        return ""
    return nombre.rsplit(".", 1)[-1].strip().lower()


def _es_texto(cabecera: bytes) -> bool:
    if b"\x00" in cabecera:
        return False
    try:
        cabecera.decode("utf-8")
        return True
    except UnicodeDecodeError as exc:
        if exc.start >= len(cabecera) - 4:
            return True
    return not any(b < 0x09 or 0x0D < b < 0x20 for b in cabecera if b != 0x1B)


def _mime_de_texto(cabecera: bytes, ext: str) -> str:
    muestra = cabecera.lstrip(b"\xef\xbb\xbf").lstrip().lower()
    if b"<svg" in muestra:
        return "image/svg+xml"
    if any(marca in muestra for marca in _MARCADO_ACTIVO):
        return "text/html"
    if muestra.startswith(b"<?xml") or (muestra.startswith(b"<") and ext in {"xml", "kml", "gml", "sld"}):
        return "application/xml"
    return _TEXTO_POR_EXT.get(ext, "text/plain")


def detectar_mime(cabecera: bytes, nombre: str | None = None) -> str:
    ext = extension(nombre)
    for firma, mime in _FIRMAS:
        if cabecera.startswith(firma):
            return mime
    if cabecera[:4] == b"RIFF" and cabecera[8:12] == b"WEBP":
        return "image/webp"
    if cabecera[4:8] == b"ftyp":
        return "video/mp4"
    if cabecera.startswith(_ZIP_FIRMAS):
        return _ZIP_POR_EXT.get(ext, "application/zip")
    if cabecera.startswith(_OLE_FIRMA):
        return _OLE_POR_EXT.get(ext, OCTET_STREAM)
    if cabecera and _es_texto(cabecera):
        return _mime_de_texto(cabecera, ext)
    return OCTET_STREAM


def detectar_mime_upload(file: UploadFile) -> str:
    file.file.seek(0)
    cabecera = file.file.read(CABECERA_BYTES)
    file.file.seek(0)
    return detectar_mime(cabecera, file.filename)


def es_activo(mime: str | None) -> bool:
    return (mime or "").lower() in MIME_ACTIVOS


def es_inline_seguro(mime: str | None) -> bool:
    return (mime or "").split(";", 1)[0].strip().lower() in MIME_INLINE_SEGUROS


_MIME_POR_EXT = {
    **_ZIP_POR_EXT,
    **_OLE_POR_EXT,
    **_TEXTO_POR_EXT,
    "txt": "text/plain",
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "webp": "image/webp",
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "svg": "image/svg+xml",
    "html": "text/html",
    "htm": "text/html",
    "xml": "application/xml",
    "kml": "application/xml",
    "gml": "application/xml",
    "sld": "application/xml",
    "zip": "application/zip",
    "rar": "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    "gz": "application/gzip",
    "gpkg": "application/geopackage+sqlite3",
    "mp4": "video/mp4",
}

_FAMILIA_TEXTO = frozenset({
    "text/plain",
    "text/csv",
    "text/tab-separated-values",
    "text/markdown",
    "application/json",
    "application/geo+json",
})

_FAMILIA_ZIP = frozenset({"application/zip", *_ZIP_POR_EXT.values()})


def mime_por_extension(ext: str) -> str:
    return _MIME_POR_EXT.get(ext.lower().lstrip("."), OCTET_STREAM)


def mime_compatible(esperado: str, detectado: str) -> bool:
    esperado = esperado.lower()
    if esperado.endswith("/*"):
        return detectado.startswith(esperado[:-1]) and not es_activo(detectado)
    if esperado == detectado:
        return True
    if esperado in _FAMILIA_TEXTO:
        return detectado in _FAMILIA_TEXTO
    if esperado in _FAMILIA_ZIP:
        return detectado in _FAMILIA_ZIP
    return False


def formato_permitido(nombre: str | None, detectado: str, accept: list[str]) -> bool:
    ext = extension(nombre)
    extensiones: set[str] = set()
    mimes: set[str] = set()
    for raw in accept:
        valor = str(raw).strip().lower()
        if "/" in valor:
            mimes.add(valor)
        elif valor:
            extensiones.add(valor.lstrip("."))
    if not ext:
        return False
    esperado = mime_por_extension(ext)
    if ext in extensiones:
        if esperado == OCTET_STREAM:
            return not es_activo(detectado)
        return mime_compatible(esperado, detectado)
    return any(mime_compatible(m, esperado) for m in mimes) and any(
        mime_compatible(m, detectado) for m in mimes
    )
