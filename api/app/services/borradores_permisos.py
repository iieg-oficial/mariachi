from fastapi import HTTPException, status

from app.api.deps import has_permission
from app.models.user import Usuario

_MAPALAB = ("mariachi.mapalab.update", ("mariachi.mapalab.manage",))
_MAPALAB_DIRECTO = ("mariachi.mapalab.update", ("mariachi.mapalab.update",))
_PORTAL = ("mariachi.portal.update", ("mariachi.portal.publish",))

PERMISOS_POR_TIPO: dict[str, tuple[str, tuple[str, ...]]] = {
    "layer": _MAPALAB,
    "layer_metadata": _MAPALAB,
    "layer_stats": _MAPALAB,
    "sld": ("mariachi.mapalab.update", ("mariachi.mapalab.manage", "mariachi.geoserver.manage")),
    "evento": _MAPALAB_DIRECTO,
    "home_section": _MAPALAB_DIRECTO,
    "pagina": _PORTAL,
    "elementos-menu": _PORTAL,
}


def _permisos(tipo: str) -> tuple[str, tuple[str, ...]]:
    return PERMISOS_POR_TIPO.get(tipo, _MAPALAB)


def puede_aprobar(user: Usuario, tipo: str) -> bool:
    return any(has_permission(user, p) for p in _permisos(tipo)[1])


def puede_editar(user: Usuario, tipo: str) -> bool:
    return has_permission(user, _permisos(tipo)[0]) or puede_aprobar(user, tipo)


def exigir_edicion(user: Usuario, tipo: str) -> None:
    if not puede_editar(user, tipo):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requiere permiso: {_permisos(tipo)[0]}",
        )


def exigir_aprobacion(user: Usuario, tipo: str) -> None:
    if not puede_aprobar(user, tipo):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requiere alguno de: {', '.join(_permisos(tipo)[1])}",
        )


def tipos_aprobables(user: Usuario) -> list[str]:
    return [tipo for tipo in PERMISOS_POR_TIPO if puede_aprobar(user, tipo)]
