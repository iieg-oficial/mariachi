import uuid
from typing import Any

from app.schemas.sieej_documentacion import TITULOS_POR_TIPO, Seccion

TIPOS_DESDE_README = ("descripcion", "fuente", "variables")
TIPOS_MEDIDOS = ("tablas", "vistas", "ejecucion", "diagrama")


def nuevo_id() -> str:
    return uuid.uuid4().hex[:12]


def contenido_desde_readme(tipo: str, readme: dict[str, Any] | None) -> dict[str, Any]:
    readme = readme or {}
    if tipo == "descripcion":
        return {"parrafos": readme.get("descripcion", []), "avisos": readme.get("avisos", [])}
    if tipo == "fuente":
        return {
            "caracteristicas": readme.get("caracteristicas", []),
            "fuente_general": readme.get("fuente_general"),
            "descargas": readme.get("descargas", []),
        }
    if tipo == "variables":
        return {"variables": readme.get("variables", [])}
    return {}


def seccion(tipo: str, readme: dict[str, Any] | None, commit: str | None) -> dict[str, Any]:
    desde_readme = tipo in TIPOS_DESDE_README
    return Seccion(
        id=nuevo_id(),
        tipo=tipo,
        titulo=TITULOS_POR_TIPO[tipo],
        origen="readme" if desde_readme else "manual",
        readme_commit=commit if desde_readme else None,
        contenido=contenido_desde_readme(tipo, readme),
    ).model_dump()


def secciones_iniciales(readme: dict[str, Any] | None, commit: str | None) -> list[dict[str, Any]]:
    tipos = []
    if readme and readme.get("descripcion"):
        tipos.append("descripcion")
    if readme:
        tipos.append("fuente")
    tipos.extend(("tablas", "vistas", "ejecucion"))
    if readme and readme.get("variables"):
        tipos.append("variables")
    tipos.append("diagrama")
    return [seccion(tipo, readme, commit) for tipo in tipos]


def contenido_inicial(
    titulo: str, producto: str, readme: dict[str, Any] | None, commit: str | None
) -> dict[str, Any]:
    return {
        "titulo": titulo,
        "producto": producto,
        "secciones": secciones_iniciales(readme, commit),
    }


def refrescar_desde_readme(
    contenido: dict[str, Any], readme: dict[str, Any] | None, commit: str | None
) -> bool:
    cambio = False
    for sec in contenido.get("secciones", []):
        if sec.get("origen") != "readme" or sec.get("editada"):
            continue
        nuevo = contenido_desde_readme(sec["tipo"], readme)
        if nuevo != sec.get("contenido") or sec.get("readme_commit") != commit:
            sec["contenido"] = nuevo
            sec["readme_commit"] = commit
            cambio = True
    return cambio


def secciones_con_readme_nuevo(contenido: dict[str, Any], commit: str | None) -> int:
    if not commit:
        return 0
    return sum(
        1
        for sec in contenido.get("secciones", [])
        if sec.get("origen") == "readme" and sec.get("editada") and sec.get("readme_commit") != commit
    )
