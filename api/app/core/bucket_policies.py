"""Políticas por bucket: prefijos ocultos en el listado del CMS y lista
canónica de buckets registrados.

Cada feature que reserva una sub-ruta dentro de un bucket compartido (p. ej.
reportes guarda screenshots en `mariachi/reportes/`) registra aquí su prefijo
para que la página de Multimedia no lo exponga al usuario final.

`KNOWN_ACERVO_BUCKETS` enumera los buckets registrables desde `acervo.buckets`.
Es la fuente que usan los validators de schemas (eventos, home, etc.) para
aceptar paths relativos del acervo en formato `bucket/object` sin habilitar
escritura de paths arbitrarios. La lista coincide con la documentada en
`repos/mariachi/contexto.md` §"Bucket compartido `iieg`" del repositorio central
de contexto.
"""

from __future__ import annotations

from dataclasses import dataclass

# Prefijos ocultos en TODOS los buckets (independiente del bucket).
# `.thumbs/` guarda la caché de miniaturas on-the-fly del Acervo.
GLOBAL_HIDDEN_PREFIXES: tuple[str, ...] = (".thumbs/",)

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
    return GLOBAL_HIDDEN_PREFIXES + HIDDEN_PREFIXES_BY_BUCKET.get(acervo_bucket, ())


@dataclass(frozen=True)
class CarpetaDeModulo:
    acervo_bucket: str
    lectura: str
    escritura: str | None = None
    prefijos: tuple[str, ...] = ()


CARPETAS_DE_MODULO: tuple[CarpetaDeModulo, ...] = (
    CarpetaDeModulo(
        acervo_bucket="mapalab",
        lectura="mariachi.mapalab.view",
        escritura="mariachi.mapalab.update",
        prefijos=("metadata/", "svg/temas/", "eventos/", "instituciones/", "home/"),
    ),
    CarpetaDeModulo(acervo_bucket="iieg", lectura="mariachi.mapalab.view"),
)

PERMISOS_DE_LECTURA_POR_MODULO: tuple[str, ...] = tuple(
    sorted({c.lectura for c in CARPETAS_DE_MODULO})
)
