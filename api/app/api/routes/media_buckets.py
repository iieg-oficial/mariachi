from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLE, get_current_user, require_role, verify_csrf
from app.core.database import get_db
from app.models.media_bucket import MediaBucket
from app.models.project import Project, UserProject
from app.models.user import Usuario
from app.schemas.media_bucket import (
    MediaBucketCreate,
    MediaBucketResponse,
    MediaBucketUpdate,
)

router = APIRouter(prefix="/media-buckets", tags=["media-buckets"])


@router.get("", response_model=list[MediaBucketResponse])
async def list_accessible_buckets(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(MediaBucket)
        .join(Project, Project.id == MediaBucket.project_id)
        .filter(MediaBucket.is_active.is_(True), Project.is_active.is_(True))
    )
    if current_user.role != ADMIN_ROLE:
        query = query.join(
            UserProject,
            (UserProject.project_id == Project.id)
            & (UserProject.user_id == current_user.id),
        )
    return query.order_by(MediaBucket.acervo_bucket).all()


@router.post("", response_model=MediaBucketResponse, status_code=status.HTTP_201_CREATED)
async def create_bucket(
    payload: MediaBucketCreate,
    _: Usuario = Depends(require_role(["tetlamamakani"])),
    __: Usuario = Depends(verify_csrf),
    db: Session = Depends(get_db),
):
    if db.query(MediaBucket).filter(MediaBucket.acervo_bucket == payload.acervo_bucket).first():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="acervo_bucket ya registrado")
    if db.query(Project).filter(Project.id == payload.project_id).first() is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="project_id inválido")
    bucket = MediaBucket(**payload.model_dump())
    db.add(bucket)
    db.commit()
    db.refresh(bucket)
    return bucket


@router.patch("/{bucket_id}", response_model=MediaBucketResponse)
async def update_bucket(
    bucket_id: int,
    payload: MediaBucketUpdate,
    _: Usuario = Depends(require_role(["tetlamamakani"])),
    __: Usuario = Depends(verify_csrf),
    db: Session = Depends(get_db),
):
    bucket = db.query(MediaBucket).filter(MediaBucket.id == bucket_id).first()
    if bucket is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="bucket no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(bucket, field, value)
    db.commit()
    db.refresh(bucket)
    return bucket
