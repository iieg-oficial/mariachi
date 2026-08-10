from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db, require_permission, verify_csrf
from app.core.database import get_dataengine_db
from app.core.time import utcnow
from app.models.borrador import Borrador
from app.models.layer import Layer, Workspace
from app.models.user import Usuario
from app.schemas.borrador import BorradorResponse, BorradorUpsert, RechazarIn
from app.services import borrador_service
from app.services.geoserver_client import GeoServerClient, GeoServerError

router = APIRouter(prefix="/borradores", tags=["borradores"])

_require_admin = require_permission('mariachi.mapalab.manage')


def _resolve_sld_layer_id(
    resource_id: str | None,
    existing_data: dict,
    dataengine_db: Session,
) -> tuple[str | None, str | None]:
    if existing_data.get('layer_id'):
        return existing_data['layer_id'], existing_data.get('style_name')
    if not resource_id or ':' not in resource_id:
        return None, None
    alias, style_name = resource_id.split(':', 1)
    if ':' in style_name:
        _prefix, _, bare = style_name.partition(':')
        style_name = bare
    ws = dataengine_db.query(Workspace).filter(Workspace.alias == alias).first()
    if not ws:
        return None, style_name
    try:
        layer_names = GeoServerClient().find_layers_using_style(ws.geoserver_workspace, style_name)
    except GeoServerError:
        return None, style_name
    for ln in layer_names:
        bare_ln = ln.split(':', 1)[-1] if ':' in ln else ln
        match = (
            dataengine_db.query(Layer)
            .filter(Layer.workspace_alias == alias, Layer.geoserver_layer == bare_ln)
            .first()
        )
        if match:
            return match.id, style_name
    return None, style_name


def _serialize_borrador(borrador: Borrador, dataengine_db: Session | None) -> dict:
    data = dict(borrador.data or {})
    if borrador.resource_type == 'sld' and dataengine_db is not None:
        layer_id, style_name = _resolve_sld_layer_id(borrador.resource_id, data, dataengine_db)
        if layer_id and not data.get('layer_id'):
            data['layer_id'] = layer_id
        if style_name and not data.get('style_name'):
            data['style_name'] = style_name
    return {
        'id': borrador.id,
        'resource_type': borrador.resource_type,
        'resource_id': borrador.resource_id,
        'usuario_id': borrador.usuario_id,
        'usuario': {
            'id': borrador.usuario.id,
            'name': borrador.usuario.name,
            'username': borrador.usuario.username,
        } if borrador.usuario else None,
        'data': data,
        'estado': borrador.estado,
        'comentario_rechazo': borrador.comentario_rechazo,
        'creado_en': borrador.creado_en,
        'actualizado_en': borrador.actualizado_en,
    }


@router.get("/pendientes")
async def obtener_pendientes(
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    _admin: Usuario = Depends(_require_admin),
):
    items = (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(Borrador.estado == 'pendiente_revision')
        .order_by(Borrador.actualizado_en.desc())
        .all()
    )
    return [_serialize_borrador(b, dataengine_db) for b in items]


@router.get("/mios", response_model=list[BorradorResponse])
async def obtener_mis_borradores(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(Borrador.usuario_id == current_user.id)
        .order_by(Borrador.actualizado_en.desc())
        .all()
    )


@router.get("/por-id/{borrador_id}", response_model=BorradorResponse)
async def obtener_borrador_por_id(
    borrador_id: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(_require_admin),
):
    borrador = (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(Borrador.id == borrador_id)
        .first()
    )
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")
    return borrador


@router.post("/por-id/{borrador_id}/aprobar")
async def aprobar_borrador(
    borrador_id: int,
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_admin),
):
    borrador = db.query(Borrador).filter(Borrador.id == borrador_id).first()
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")
    if borrador.estado != 'pendiente_revision':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Solo se aprueban borradores en estado 'pendiente_revision' (actual: {borrador.estado})",
        )

    result = borrador_service.apply_borrador(db, dataengine_db, borrador, current_user.email)

    borrador.estado = 'aprobado'
    borrador.actualizado_en = utcnow()
    db.commit()

    return {'ok': True, **result}


@router.post("/por-id/{borrador_id}/rechazar")
async def rechazar_borrador(
    borrador_id: int,
    body: RechazarIn,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
):
    borrador = db.query(Borrador).filter(Borrador.id == borrador_id).first()
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")

    borrador.estado = 'rechazado'
    borrador.comentario_rechazo = body.comentario
    borrador.actualizado_en = utcnow()
    db.commit()
    return {"ok": True}


@router.delete("/por-id/{borrador_id}")
async def eliminar_borrador_por_id(
    borrador_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
):
    borrador = db.query(Borrador).filter(Borrador.id == borrador_id).first()
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")

    db.delete(borrador)
    db.commit()
    return {"message": "Borrador eliminado"}


_ACTIVO_FILTER = Borrador.estado.in_(('en_progreso', 'pendiente_revision', 'rechazado'))


@router.get("/{resource_type}/{resource_id}", response_model=BorradorResponse | None)
async def obtener_borrador(
    resource_type: str,
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(
            Borrador.resource_type == resource_type,
            Borrador.resource_id == resource_id,
            Borrador.usuario_id == current_user.id,
            _ACTIVO_FILTER,
        )
        .first()
    )


@router.put("/{resource_type}/{resource_id}", response_model=BorradorResponse)
async def guardar_borrador(
    resource_type: str,
    resource_id: str,
    borrador_in: BorradorUpsert,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    borrador = (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(
            Borrador.resource_type == resource_type,
            Borrador.resource_id == resource_id,
            Borrador.usuario_id == current_user.id,
            _ACTIVO_FILTER,
        )
        .first()
    )

    if borrador:
        borrador.data = borrador_in.data
        borrador.estado = 'en_progreso'
        borrador.comentario_rechazo = None
        borrador.actualizado_en = utcnow()
    else:
        borrador = Borrador(
            resource_type=resource_type,
            resource_id=resource_id,
            usuario_id=current_user.id,
            data=borrador_in.data,
            estado='en_progreso',
        )
        db.add(borrador)

    db.commit()
    db.refresh(borrador)
    return borrador


@router.post("/layer/{layer_id}/solicitar-eliminacion")
async def solicitar_eliminacion_capa(
    layer_id: str,
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
):
    """Crea/actualiza un borrador con action='delete' y lo deja en
    pendiente_revision. Es el flujo que usan los editores no-admin para pedir
    que un admin apruebe el archivado de una capa."""
    layer = dataengine_db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Capa '{layer_id}' no encontrada")

    borrador = (
        db.query(Borrador)
        .filter(
            Borrador.resource_type == 'layer',
            Borrador.resource_id == layer_id,
            Borrador.usuario_id == current_user.id,
            _ACTIVO_FILTER,
        )
        .first()
    )
    payload = {'action': 'delete'}
    if borrador:
        borrador.data = payload
        borrador.estado = 'pendiente_revision'
        borrador.comentario_rechazo = None
        borrador.actualizado_en = utcnow()
    else:
        borrador = Borrador(
            resource_type='layer',
            resource_id=layer_id,
            usuario_id=current_user.id,
            data=payload,
            estado='pendiente_revision',
        )
        db.add(borrador)
    db.commit()
    db.refresh(borrador)
    return {'ok': True, 'borrador_id': borrador.id, 'estado': borrador.estado}


@router.post("/{resource_type}/{resource_id}/solicitar-revision")
async def solicitar_revision(
    resource_type: str,
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    borrador = db.query(Borrador).filter(
        Borrador.resource_type == resource_type,
        Borrador.resource_id == resource_id,
        Borrador.usuario_id == current_user.id,
        _ACTIVO_FILTER,
    ).first()

    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guarda un borrador primero")

    borrador.estado = 'pendiente_revision'
    borrador.comentario_rechazo = None
    borrador.actualizado_en = utcnow()
    db.commit()
    return {"ok": True}


@router.delete("/{resource_type}/{resource_id}")
async def eliminar_borrador(
    resource_type: str,
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    borrador = db.query(Borrador).filter(
        Borrador.resource_type == resource_type,
        Borrador.resource_id == resource_id,
        Borrador.usuario_id == current_user.id,
        _ACTIVO_FILTER,
    ).first()

    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")

    db.delete(borrador)
    db.commit()
    return {"message": "Borrador eliminado"}


@router.get("/historial/sld/{resource_id}")
async def obtener_historial_sld(
    resource_id: str,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(_require_admin),
):
    items = (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(
            Borrador.resource_type == 'sld',
            Borrador.resource_id == resource_id,
            Borrador.estado == 'aprobado',
        )
        .order_by(Borrador.actualizado_en.desc())
        .all()
    )
    return [
        {
            'id': b.id,
            'resource_id': b.resource_id,
            'data': b.data,
            'usuario': {
                'id': b.usuario.id,
                'name': b.usuario.name,
                'username': b.usuario.username,
            } if b.usuario else None,
            'aprobado_en': b.actualizado_en,
            'creado_en': b.creado_en,
        }
        for b in items
    ]


@router.post("/por-id/{borrador_id}/re-aplicar")
async def re_aplicar_borrador(
    borrador_id: int,
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
):
    borrador = db.query(Borrador).filter(Borrador.id == borrador_id).first()
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")
    if borrador.estado != 'aprobado':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede re-aplicar un borrador con estado 'aprobado'",
        )
    if borrador.resource_type != 'sld':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="re-aplicar solo soporta resource_type='sld'",
        )

    result = borrador_service.apply_borrador(
        db, dataengine_db, borrador, current_user.username,
    )
    duplicado = Borrador(
        resource_type=borrador.resource_type,
        resource_id=borrador.resource_id,
        usuario_id=current_user.id,
        data=borrador.data,
        estado='aprobado',
    )
    db.add(duplicado)
    db.commit()
    return {'ok': True, 'result': result, 'historial_id': duplicado.id}
