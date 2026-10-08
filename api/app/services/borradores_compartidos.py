from dataclasses import dataclass, field
from typing import Any

from app.models.borrador import TIPOS_COMPARTIDOS


def es_compartido(resource_type: str) -> bool:
    return resource_type in TIPOS_COMPARTIDOS


@dataclass
class Combinacion:
    data: dict[str, Any]
    autores: dict[str, dict[str, Any]]
    version: int
    conflictos: list[dict[str, Any]] = field(default_factory=list)


def _conflictos(
    autores: dict[str, dict[str, Any]],
    campos: list[str],
    usuario: str,
    version_base: int | None,
) -> list[dict[str, Any]]:
    if version_base is None:
        return []
    choques = []
    for campo in campos:
        autor = autores.get(campo) or {}
        if autor and autor.get('usuario') != usuario and int(autor.get('version') or 0) > version_base:
            choques.append({'campo': campo, 'usuario': autor.get('usuario'), 'nombre': autor.get('nombre')})
    return choques


def combinar(
    data: dict[str, Any] | None,
    autores: dict[str, dict[str, Any]] | None,
    version: int,
    entrantes: dict[str, Any],
    quitar: list[str],
    usuario: str,
    nombre: str | None,
    version_base: int | None = None,
) -> Combinacion:
    data = dict(data or {})
    autores = dict(autores or {})
    choques = _conflictos(autores, [*entrantes, *quitar], usuario, version_base)
    if choques:
        return Combinacion(data, autores, version, choques)

    nueva = version + 1
    for campo, valor in entrantes.items():
        data[campo] = valor
        autores[campo] = {'usuario': usuario, 'nombre': nombre, 'version': nueva}
    for campo in quitar:
        if campo in entrantes:
            continue
        data.pop(campo, None)
        autores.pop(campo, None)
    return Combinacion(data, autores, nueva)


def quitar_campos(
    data: dict[str, Any] | None,
    autores: dict[str, dict[str, Any]] | None,
    campos: list[str],
) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    restantes = {k: v for k, v in (data or {}).items() if k not in campos}
    autores_restantes = {k: v for k, v in (autores or {}).items() if k not in campos}
    return restantes, autores_restantes


def describir_conflicto(conflictos: list[dict[str, Any]]) -> str:
    quienes = sorted({c.get('nombre') or c.get('usuario') or 'alguien' for c in conflictos})
    campos = ', '.join(c['campo'] for c in conflictos)
    return f"{' y '.join(quienes)} cambió {campos} hace un momento. Recarga para ver su versión antes de seguir."
