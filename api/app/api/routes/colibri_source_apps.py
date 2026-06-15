from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, verify_csrf
from app.core.time import utcnow
from app.models.reporte import Reporte
from app.models.source_app import SourceApp
from app.models.user import Usuario
from app.schemas.source_app import (
    SourceAppCreate,
    SourceAppKeyRotateRequest,
    SourceAppKeyRotateResponse,
    SourceAppResponse,
    SourceAppUpdate,
)
from app.services.actividad_service import registrar_actividad
from app.services.colibri_keys import generate_api_key

router = APIRouter(prefix="/colibri/source-apps", tags=["colibri source-apps"])


def _to_response(source_app: SourceApp) -> SourceAppResponse:
    return SourceAppResponse.model_validate(
        {
            "id": source_app.id,
            "slug": source_app.slug,
            "nombre": source_app.nombre,
            "descripcion": source_app.descripcion,
            "api_key_prefix": source_app.api_key_prefix,
            "has_api_key": bool(source_app.api_key_hash),
            "dominios_permitidos": source_app.dominios_permitidos or [],
            "tipos_permitidos": source_app.tipos_permitidos,
            "rate_limit_per_hour": source_app.rate_limit_per_hour,
            "branding": source_app.branding,
            "notificar_discord": source_app.notificar_discord,
            "discord_webhook_url": source_app.discord_webhook_url,
            "disable_pii": source_app.disable_pii,
            "privacy_url": source_app.privacy_url,
            "scrubbers": source_app.scrubbers,
            "activo": source_app.activo,
            "creado_en": source_app.creado_en,
            "actualizado_en": source_app.actualizado_en,
        }
    )


@router.get("", response_model=list[SourceAppResponse])
async def listar_source_apps(
    db: Session = Depends(get_db),
    activo: bool | None = Query(default=None),
    _admin: Usuario = Depends(require_role(["tetlamamakani"])),
):
    query = db.query(SourceApp)
    if activo is not None:
        query = query.filter(SourceApp.activo.is_(activo))
    return [_to_response(sa) for sa in query.order_by(SourceApp.id.asc()).all()]


@router.get("/{source_app_id}", response_model=SourceAppResponse)
async def obtener_source_app(
    source_app_id: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role(["tetlamamakani"])),
):
    source_app = db.query(SourceApp).filter(SourceApp.id == source_app_id).first()
    if not source_app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source app no encontrado")
    return _to_response(source_app)


@router.post("", response_model=SourceAppResponse, status_code=status.HTTP_201_CREATED)
async def crear_source_app(
    payload: SourceAppCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    if db.query(SourceApp).filter(SourceApp.slug == payload.slug).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un source app con slug '{payload.slug}'",
        )

    source_app = SourceApp(**payload.model_dump())
    db.add(source_app)
    db.flush()
    registrar_actividad(
        db,
        actor=current_user,
        action="colibri.source_app.create",
        resource_type="colibri.source_app",
        resource_id=source_app.id,
        metadata={"slug": source_app.slug},
    )
    db.commit()
    db.refresh(source_app)
    return _to_response(source_app)


@router.patch("/{source_app_id}", response_model=SourceAppResponse)
async def actualizar_source_app(
    source_app_id: int,
    payload: SourceAppUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    source_app = db.query(SourceApp).filter(SourceApp.id == source_app_id).first()
    if not source_app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source app no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("activo") is True and not source_app.api_key_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede activar un source app sin API key. Genera la key primero con /rotate-key.",
        )

    for field, value in update_data.items():
        setattr(source_app, field, value)
    source_app.actualizado_en = utcnow()
    registrar_actividad(
        db,
        actor=current_user,
        action="colibri.source_app.update",
        resource_type="colibri.source_app",
        resource_id=source_app.id,
        metadata={"slug": source_app.slug, "fields": sorted(update_data.keys())},
    )
    db.commit()
    db.refresh(source_app)
    return _to_response(source_app)


@router.delete("/{source_app_id}")
async def eliminar_source_app(
    source_app_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    source_app = db.query(SourceApp).filter(SourceApp.id == source_app_id).first()
    if not source_app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source app no encontrado")

    en_uso = db.query(Reporte).filter(Reporte.source_app_id == source_app_id).count()
    if en_uso > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede eliminar: {en_uso} reporte(s) referencian este source app. Desactívalo en lugar de eliminar.",
        )

    source_app_id_local = source_app.id
    source_app_slug = source_app.slug
    registrar_actividad(
        db,
        actor=current_user,
        action="colibri.source_app.delete",
        resource_type="colibri.source_app",
        resource_id=source_app_id_local,
        metadata={"slug": source_app_slug},
    )
    db.delete(source_app)
    db.commit()
    return {"message": "Source app eliminado"}


@router.post("/{source_app_id}/rotate-key", response_model=SourceAppKeyRotateResponse)
async def rotar_api_key(
    source_app_id: int,
    payload: SourceAppKeyRotateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    source_app = db.query(SourceApp).filter(SourceApp.id == source_app_id).first()
    if not source_app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source app no encontrado")

    plain_key, prefix, hashed = generate_api_key(payload.visibility)
    source_app.api_key_hash = hashed
    source_app.api_key_prefix = prefix
    source_app.actualizado_en = utcnow()
    registrar_actividad(
        db,
        actor=current_user,
        action="colibri.source_app.rotate_key",
        resource_type="colibri.source_app",
        resource_id=source_app.id,
        metadata={"slug": source_app.slug, "visibility": payload.visibility, "prefix": prefix},
    )
    db.commit()

    return SourceAppKeyRotateResponse(
        plain_key=plain_key,
        api_key_prefix=prefix,
        visibility=payload.visibility,
    )
