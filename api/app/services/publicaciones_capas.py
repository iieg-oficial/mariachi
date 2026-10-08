import logging
from typing import Any

from fastapi import HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.borrador import Borrador
from app.models.layer import Layer
from app.models.layer_metadata import LayerMetadata, LayerStats
from app.models.publicacion_capa import PublicacionCapa
from app.schemas.layer import LayerUpdate
from app.schemas.layer_metadata import LayerMetadataUpdate, LayerStatsUpdate

logger = logging.getLogger(__name__)

_ESQUEMAS = {
    'layer': LayerUpdate,
    'layer_metadata': LayerMetadataUpdate,
    'layer_stats': LayerStatsUpdate,
}
_MODELOS = {
    'layer': (Layer, 'id'),
    'layer_metadata': (LayerMetadata, 'layer_key'),
    'layer_stats': (LayerStats, 'layer_key'),
}
_IGNORADOS = {'action', 'id', 'layer_key'}


def quien(usuario: Any) -> str:
    return getattr(usuario, 'name', None) or getattr(usuario, 'email', None) or getattr(usuario, 'username', '')


def campos_de(tipo: str, data: dict[str, Any]) -> list[str]:
    esquema = _ESQUEMAS.get(tipo)
    normalizado: dict[str, Any] = data or {}
    if esquema is not None:
        try:
            normalizado = esquema.model_validate(data or {}).model_dump(exclude_unset=True, by_alias=False)
        except ValidationError:
            normalizado = data or {}
    return [c for c in normalizado if c not in _IGNORADOS]


def fila(dataengine_db: Session, tipo: str, recurso_id: str) -> Any:
    modelo, llave = _MODELOS[tipo]
    return dataengine_db.query(modelo).filter(getattr(modelo, llave) == recurso_id).first()


def foto(row: Any, campos: list[str]) -> dict[str, Any]:
    if row is None:
        return {}
    return jsonable_encoder({c: getattr(row, c) for c in campos if hasattr(row, c)})


def cambios(antes: dict[str, Any], despues: dict[str, Any]) -> list[str]:
    return sorted(c for c in set(antes) | set(despues) if antes.get(c) != despues.get(c))


def registrar(
    db: Session,
    tipo: str,
    recurso_id: str,
    antes: dict[str, Any],
    despues: dict[str, Any],
    usuario: str,
    origen: str = 'editor',
    deshace_id: int | None = None,
) -> PublicacionCapa | None:
    campos = cambios(antes, despues)
    if not campos:
        return None
    publicacion = PublicacionCapa(
        resource_type=tipo,
        resource_id=recurso_id,
        antes={c: antes.get(c) for c in campos},
        despues={c: despues.get(c) for c in campos},
        usuario=usuario,
        origen=origen,
        deshace_id=deshace_id,
    )
    db.add(publicacion)
    db.commit()
    db.refresh(publicacion)
    return publicacion


def registrar_sin_romper(db: Session, *args: Any, **kwargs: Any) -> None:
    try:
        registrar(db, *args, **kwargs)
    except Exception:
        db.rollback()
        logger.warning('No se pudo registrar la publicación de %s', args[:2], exc_info=True)


def ultima(db: Session, tipo: str, recurso_id: str) -> PublicacionCapa | None:
    return (
        db.query(PublicacionCapa)
        .filter(PublicacionCapa.resource_type == tipo, PublicacionCapa.resource_id == recurso_id)
        .order_by(PublicacionCapa.creado_en.desc(), PublicacionCapa.id.desc())
        .first()
    )


def ultimas(db: Session, recursos: list[tuple[str, str]]) -> list[PublicacionCapa]:
    halladas = [ultima(db, tipo, recurso_id) for tipo, recurso_id in recursos]
    return sorted((p for p in halladas if p), key=lambda p: (p.creado_en, p.id), reverse=True)


def validar_deshacer(publicacion: PublicacionCapa | None, mas_reciente: PublicacionCapa | None, actual: dict[str, Any]) -> None:
    if publicacion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Publicación no encontrada')
    if publicacion.deshecha_en is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Esta publicación ya se deshizo')
    if mas_reciente is None or mas_reciente.id != publicacion.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Después de esta hubo otra publicación del mismo recurso; sólo se deshace la última',
        )
    if actual != publicacion.despues:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Estos campos cambiaron por otra vía desde que se publicaron; revísalos antes de deshacer',
        )


def deshacer(db: Session, dataengine_db: Session, publicacion_id: int, usuario: str) -> PublicacionCapa:
    from app.services import borrador_service

    publicacion = db.get(PublicacionCapa, publicacion_id)
    mas_reciente = ultima(db, publicacion.resource_type, publicacion.resource_id) if publicacion else None
    campos = list((publicacion.despues or {}).keys()) if publicacion else []
    actual = foto(fila(dataengine_db, publicacion.resource_type, publicacion.resource_id), campos) if publicacion else {}
    validar_deshacer(publicacion, mas_reciente, actual)

    transitorio = Borrador(
        resource_type=publicacion.resource_type,
        resource_id=publicacion.resource_id,
        data=dict(publicacion.antes),
    )
    borrador_service.apply_borrador(db, dataengine_db, transitorio, usuario)

    despues = foto(fila(dataengine_db, publicacion.resource_type, publicacion.resource_id), campos)
    publicacion.deshecha_en = utcnow()
    publicacion.deshecha_por = usuario
    db.commit()
    reversa = registrar(
        db,
        publicacion.resource_type,
        publicacion.resource_id,
        publicacion.despues,
        despues,
        usuario,
        origen='deshacer',
        deshace_id=publicacion.id,
    )
    return reversa or publicacion
