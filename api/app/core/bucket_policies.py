"""Políticas por bucket: prefijos ocultos en el listado del CMS.

Cada feature que reserva una sub-ruta dentro de un bucket compartido (p. ej.
reportes guarda screenshots en `mariachi/reportes/`) registra aquí su prefijo
para que la página de Multimedia no lo exponga al usuario final.
"""

from __future__ import annotations

HIDDEN_PREFIXES_BY_BUCKET: dict[str, tuple[str, ...]] = {
    "mariachi": ("reportes/",),
}


def get_hidden_prefixes(acervo_bucket: str) -> tuple[str, ...]:
    return HIDDEN_PREFIXES_BY_BUCKET.get(acervo_bucket, ())
