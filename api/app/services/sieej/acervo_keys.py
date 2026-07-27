"""Construccion de las claves de objeto en Acervo para los archivos de SIEEJ.

La convencion anterior (`{slug}/envio{id}/{uuid}.{ext}`) dejaba el bucket
ilegible: el nombre real del archivo, el campo al que pertenece y cual de
varias versiones es la vigente solo se sabian cruzando con `envio_archivo`.
Con los reemplazos post-envio el problema crece, porque cada correccion suma
otro UUID en la misma carpeta.

La convencion vigente es:

    {slug}/{usuario}-{envio_id}[/{periodo}]/{step}.{campo}/{ts}-{nombre}-{sufijo}.{ext}
    {slug}/{usuario}-{envio_id}[/{periodo}]/envio.json

Ejemplo:

    mundial/sedeco-enlace-17/alta_archivos.base_de_datos/
        20260727T171309Z-direccion-de-integracion-operativa-a3f9c1.xlsx
    mundial/sedeco-enlace-17/envio.json

    censo/sedeco-enlace-23/2026-01/general.archivo/20260115T090000Z-padron-4c2b1a.csv

Cada envio tiene su directorio y dentro un directorio por campo, donde las
versiones ordenan cronologicamente. El sufijo corto evita colisiones si el
mismo campo se sube dos veces en el mismo segundo.

El usuario va **antes** del id para que al listar el bucket los envios de una
misma persona queden contiguos: buscar a mano "lo que subio Fulano" es el caso
de uso que justifica tener identidad en la ruta. El id desempata y ancla la
carpeta a un envio concreto. La ruta registra quien capturo **en ese momento**
(un hecho historico, como `filename_original`); el dato vigente vive en
`envio.json`, junto con el respaldo completo del envio (datos + definicion +
catalogo de archivos) para poder reconstruirlo sin la BD.

El **periodo solo aparece cuando el formulario es periodico**: en los demas
seria un nivel con un unico hijo siempre, ruido puro. Un envio pertenece a lo
sumo a un periodo, asi que el segmento identifica al envio, no agrupa.
"""
from __future__ import annotations

import re
import unicodedata
import uuid
from datetime import datetime
from typing import Any

from app.core.time import utcnow

MAX_NOMBRE = 60
RESPALDO_JSON = "envio.json"


def sanitizar_segmento(valor: str, *, max_len: int = MAX_NOMBRE) -> str:
    """Normaliza un texto para usarlo como segmento de una clave de objeto."""
    normalizado = unicodedata.normalize("NFKD", valor or "")
    ascii_only = normalizado.encode("ascii", "ignore").decode("ascii").lower()
    limpio = re.sub(r"[^a-z0-9]+", "-", ascii_only).strip("-")
    return limpio[:max_len].strip("-")


def _partes_nombre(filename: str | None) -> tuple[str, str]:
    """Devuelve `(nombre_sanitizado, extension)` de un nombre de archivo."""
    nombre = filename or ""
    if "." in nombre:
        base, _, ext = nombre.rpartition(".")
    else:
        base, ext = nombre, ""
    return sanitizar_segmento(base) or "archivo", sanitizar_segmento(ext, max_len=12)


def segmento_campo(field_path: str) -> str:
    """`bases_datos[0].diccionario` -> `bases_datos-0.diccionario`."""
    return re.sub(r"\[(\d+)\]", r"-\1", field_path or "campo")


def prefijo_envio(
    *,
    slug: str,
    envio_id: int,
    usuario: str | None = None,
    periodo_clave: str | None = None,
) -> str:
    """Directorio de un envio: `{slug}/{usuario}-{id}` y, solo si el formulario
    es periodico, `/{periodo}`."""
    quien = sanitizar_segmento(usuario, max_len=40) if usuario else ""
    periodo = sanitizar_segmento(periodo_clave) if periodo_clave else ""
    partes = [
        sanitizar_segmento(slug, max_len=128),
        f"{quien}-{envio_id}" if quien else str(envio_id),
    ]
    if periodo:
        partes.append(periodo)
    return "/".join(partes)


def construir_object_key(
    *,
    slug: str,
    envio_id: int,
    field_path: str,
    filename: str | None,
    usuario: str | None = None,
    periodo_clave: str | None = None,
    momento: datetime | None = None,
) -> str:
    nombre, ext = _partes_nombre(filename)
    ts = (momento or utcnow()).strftime("%Y%m%dT%H%M%SZ")
    sufijo = uuid.uuid4().hex[:6]
    archivo = f"{ts}-{nombre}-{sufijo}"
    return "/".join(
        [
            prefijo_envio(
                slug=slug,
                envio_id=envio_id,
                usuario=usuario,
                periodo_clave=periodo_clave,
            ),
            segmento_campo(field_path),
            f"{archivo}.{ext}" if ext else archivo,
        ]
    )


def construir_respaldo_key(
    *,
    slug: str,
    envio_id: int,
    usuario: str | None = None,
    periodo_clave: str | None = None,
) -> str:
    """Clave del `envio.json` que respalda el envio junto a sus archivos."""
    return "/".join(
        [
            prefijo_envio(
                slug=slug,
                envio_id=envio_id,
                usuario=usuario,
                periodo_clave=periodo_clave,
            ),
            RESPALDO_JSON,
        ]
    )


def valor_archivo(
    *,
    field_path: str,
    url_publica: str,
    object_key: str,
    filename: str,
    mime: str,
    size_bytes: int,
) -> dict[str, Any]:
    """Contrato canonico del valor de un campo `file` dentro de `datos`.

    Antes convivian dos formas: la del backend (`filename`) y la que el
    frontend guardaba al pisar el valor con la respuesta del upload
    (`filename_original` + `field_path`). Los lectores buscaban
    `filename_original` y caian a la URL cruda cuando el valor venia del
    backend, asi que el export y el PDF mostraban un enlace largo en vez del
    nombre. La clave canonica es `filename_original`; `nombre_archivo` lee
    ambas para los datos ya guardados.
    """
    return {
        "field_path": field_path,
        "url_publica": url_publica,
        "object_key": object_key,
        "filename_original": filename,
        "mime": mime,
        "size_bytes": size_bytes,
    }


def nombre_archivo(valor: Any) -> str | None:
    """Nombre legible de un valor de archivo, tolerante a las formas viejas."""
    if not isinstance(valor, dict):
        return None
    return valor.get("filename_original") or valor.get("filename") or None
