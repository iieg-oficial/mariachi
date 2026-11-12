from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.layer import Layer
from app.schemas.layer import LayerCreate
from app.services import layer_service
from app.services.geoserver_client import GeoServerError


def validar_lote(
    capas: list[LayerCreate],
    vivos: set[str],
    borrados: set[str],
) -> list[dict]:
    errores: list[dict] = []
    vistos: set[str] = set()
    for fila, capa in enumerate(capas):
        if capa.id in vistos:
            errores.append({'fila': fila, 'id': capa.id, 'detail': 'El id se repite en el lote'})
        elif capa.id in vivos:
            errores.append({'fila': fila, 'id': capa.id, 'detail': 'Ya existe una capa con ese id'})
        elif capa.id in borrados:
            errores.append({'fila': fila, 'id': capa.id, 'detail': 'Ese id esta en la papelera'})
        if capa.node_type == 'tema' and capa.parent_id:
            errores.append({'fila': fila, 'id': capa.id, 'detail': 'Un tema no lleva padre'})
        elif capa.node_type != 'tema' and not capa.parent_id:
            errores.append({'fila': fila, 'id': capa.id, 'detail': 'Falta el padre'})
        elif capa.parent_id and capa.parent_id not in vivos and capa.parent_id not in vistos:
            errores.append({
                'fila': fila,
                'id': capa.id,
                'detail': f"El padre '{capa.parent_id}' no existe",
            })
        vistos.add(capa.id)
    return errores


def crear_lote(session: Session, capas: list[LayerCreate], updated_by: str | None) -> list[dict]:
    ids = {c.id for c in capas} | {c.parent_id for c in capas if c.parent_id}
    filas = session.query(Layer.id, Layer.deleted_at).filter(Layer.id.in_(ids)).all()
    vivos = {i for i, borrado in filas if borrado is None}
    borrados = {i for i, borrado in filas if borrado is not None}

    errores = validar_lote(capas, vivos, borrados)
    if errores:
        return errores

    for fila, capa in enumerate(capas):
        try:
            layer_service.create_layer(session, capa, updated_by=updated_by)
        except (ValueError, GeoServerError) as exc:
            errores.append({'fila': fila, 'id': capa.id, 'detail': str(exc)})
    return errores
