"""Catalogos que el sistema necesita para funcionar y el admin no puede
eliminar.

No hay columna en BD que los marque: la fuente de verdad es este modulo.
Un catalogo listado aqui se puede renombrar y se le pueden agregar,
renombrar o quitar opciones desde `/sieej/catalogos`, pero `delete_catalog`
lo bloquea con 409 — si desapareciera, los campos `date_range` que lo usan
por defecto se quedarian sin opciones de fecha abierta.

La migracion `b7c8d9e0f1a2` los siembra con un juego inicial de opciones.
"""
from __future__ import annotations

from typing import Any

CATALOGO_ESTATUS_FECHA = "estatus_fecha"

SYSTEM_CATALOGS: dict[str, str] = {
    CATALOGO_ESTATUS_FECHA: "Estatus de fecha",
}

OPTION_KEYS = {"start": "startOption", "end": "endOption"}


def es_catalogo_sistema(clave: str) -> bool:
    return clave in SYSTEM_CATALOGS


def open_range_catalog(field: dict[str, Any]) -> str:
    """Catalogo del que salen las opciones de fecha abierta de un
    `date_range`; cae al del sistema si el field no fija uno."""
    clave = field.get("openCatalog")
    if isinstance(clave, str) and clave:
        return clave
    return CATALOGO_ESTATUS_FECHA


def permite_extremo_abierto(field: dict[str, Any], extremo: str) -> bool:
    return bool(field.get("openStart" if extremo == "start" else "openEnd"))
