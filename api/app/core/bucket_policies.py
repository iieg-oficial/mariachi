"""Políticas por bucket: prefijos ocultos en el listado del CMS y lista
canónica de buckets registrados.

Cada feature que reserva una sub-ruta dentro de un bucket compartido (p. ej.
reportes guarda screenshots en `mariachi/reportes/`) registra aquí su prefijo
para que la página de Multimedia no lo exponga al usuario final.

`KNOWN_ACERVO_BUCKETS` enumera los buckets registrables desde `media_buckets`.
Es la fuente que usan los validators de schemas (eventos, home, etc.) para
aceptar paths relativos del acervo en formato `bucket/object` sin habilitar
escritura de paths arbitrarios. La lista coincide con la documentada en
`docs/context.md` §"Bucket compartido `iieg`".
"""

from __future__ import annotations

HIDDEN_PREFIXES_BY_BUCKET: dict[str, tuple[str, ...]] = {
    "mariachi": ("reportes/",),
}


KNOWN_ACERVO_BUCKETS: frozenset[str] = frozenset({
    "portal",
    "mapalab",
    "iieg",
    "mariachi",
    "sieej",
    "dataengine",
})


def get_hidden_prefixes(acervo_bucket: str) -> tuple[str, ...]:
    return HIDDEN_PREFIXES_BY_BUCKET.get(acervo_bucket, ())
