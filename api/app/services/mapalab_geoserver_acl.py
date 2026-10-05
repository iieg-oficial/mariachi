from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.layer import Layer, Workspace
from app.services.geoserver_client import GeoServerClient

logger = logging.getLogger(__name__)

ROL = "MAPALAB_PRIVADA"
_RUTA = "security/acl/layers"


def _custodiadas(filas: list[tuple[str, str | None, bool]]) -> set[str]:
    padre = {fid: pid for fid, pid, _ in filas}
    privadas = {fid for fid, _, es in filas if es}
    salida: set[str] = set()
    for fid in padre:
        actual: str | None = fid
        vistos: set[str] = set()
        while actual is not None and actual not in vistos:
            vistos.add(actual)
            if actual in privadas:
                salida.add(fid)
                break
            actual = padre.get(actual)
    return salida


def reglas_deseadas(de: Session) -> set[str]:
    filas = de.execute(
        select(Layer.id, Layer.parent_id, Layer.privada, Layer.workspace_alias, Layer.geoserver_layer)
        .where(Layer.deleted_at.is_(None))
    ).all()
    espacios = dict(de.execute(select(Workspace.alias, Workspace.geoserver_workspace)).all())
    custodiadas = _custodiadas([(f[0], f[1], bool(f[2])) for f in filas])
    por_capa: dict[str, list[bool]] = {}
    for fid, _, _, alias, capa in filas:
        espacio = espacios.get(alias)
        if not espacio or not capa:
            continue
        por_capa.setdefault(f"{espacio}.{capa}.r", []).append(fid in custodiadas)
    return {regla for regla, marcas in por_capa.items() if all(marcas)}


def sincronizar(de: Session, client: GeoServerClient | None = None) -> dict[str, list[str]]:
    client = client or GeoServerClient()
    deseadas = reglas_deseadas(de)
    with client._client() as http:
        resp = http.get(client._rest_url(f"{_RUTA}.json"))
        resp.raise_for_status()
        actuales: dict[str, str] = resp.json() or {}
        nuestras = {regla for regla, roles in actuales.items() if roles == ROL}
        agregadas: list[str] = []
        conflictos: list[str] = []
        for regla in sorted(deseadas - nuestras):
            if regla in actuales:
                conflictos.append(regla)
                continue
            http.post(client._rest_url(_RUTA), json={regla: ROL}).raise_for_status()
            agregadas.append(regla)
        quitadas: list[str] = []
        for regla in sorted(nuestras - deseadas):
            http.delete(client._rest_url(f"{_RUTA}/{regla}")).raise_for_status()
            quitadas.append(regla)
    if agregadas or quitadas or conflictos:
        logger.info("action=geoserver_acl.sync agregadas=%s quitadas=%s conflictos=%s", agregadas, quitadas, conflictos)
    return {"agregadas": agregadas, "quitadas": quitadas, "conflictos": conflictos}


def sincronizar_sin_fallar(de: Session) -> dict[str, Any] | None:
    try:
        return sincronizar(de)
    except Exception as exc:
        logger.warning("geoserver_acl.sync fallo: %s", exc)
        return None
