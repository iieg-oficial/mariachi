import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role, verify_csrf
from app.api.metrics import COUNTER_MEDIA_BUCKET_WRITES, incr
from app.core.database import get_db
from app.models.acervo_bucket import AcervoBucket
from app.models.project import Project
from app.models.user import Usuario
from app.schemas.acervo_bucket import (
    AcervoBucketCreate,
    AcervoBucketResponse,
    AcervoBucketUpdate,
)
from app.services import acervo_file_service
from app.services.actividad_service import registrar_actividad

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/acervo-buckets", tags=["acervo-buckets"])


@router.get("", response_model=list[AcervoBucketResponse])
async def list_accessible_buckets(
    include_inactive: bool = False,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return acervo_file_service.buckets_accesibles(db, current_user, include_inactive)


@router.post("", response_model=AcervoBucketResponse, status_code=status.HTTP_201_CREATED)
async def create_bucket(
    payload: AcervoBucketCreate,
    _: Usuario = Depends(require_role(["tetlamamakani"])),
    __: Usuario = Depends(verify_csrf),
    db: Session = Depends(get_db),
):
    if db.query(AcervoBucket).filter(AcervoBucket.acervo_bucket == payload.acervo_bucket).first():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="acervo_bucket ya registrado")
    if db.query(Project).filter(Project.id == payload.project_id).first() is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="project_id inválido")
    bucket = AcervoBucket(**payload.model_dump())
    db.add(bucket)
    db.flush()
    registrar_actividad(
        db,
        actor=_,
        action="acervo.bucket.create",
        resource_type="acervo.bucket",
        resource_id=bucket.id,
        metadata={"acervo_bucket": bucket.acervo_bucket, "project_id": bucket.project_id},
    )
    db.commit()
    db.refresh(bucket)
    incr(COUNTER_MEDIA_BUCKET_WRITES)
    logger.info("action=bucket.create user_id=%s acervo_bucket=%s", _.id, bucket.acervo_bucket)
    return bucket


@router.patch("/{bucket_id}", response_model=AcervoBucketResponse)
async def update_bucket(
    bucket_id: int,
    payload: AcervoBucketUpdate,
    _: Usuario = Depends(require_role(["tetlamamakani"])),
    __: Usuario = Depends(verify_csrf),
    db: Session = Depends(get_db),
):
    bucket = db.query(AcervoBucket).filter(AcervoBucket.id == bucket_id).first()
    if bucket is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="bucket no encontrado")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bucket, field, value)
    registrar_actividad(
        db,
        actor=_,
        action="acervo.bucket.update",
        resource_type="acervo.bucket",
        resource_id=bucket.id,
        metadata={"acervo_bucket": bucket.acervo_bucket, "fields": sorted(update_data.keys())},
    )
    db.commit()
    db.refresh(bucket)
    incr(COUNTER_MEDIA_BUCKET_WRITES)
    logger.info("action=bucket.update user_id=%s bucket_id=%s", _.id, bucket.id)
    return bucket
