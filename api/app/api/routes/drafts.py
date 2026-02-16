from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_csrf
from app.models.draft import Draft
from app.models.user import Usuario
from app.schemas.draft import DraftCreate, DraftResponse

router = APIRouter(prefix="/borradores", tags=["borradores"])


@router.get("/{resource_type}", response_model=DraftResponse | None)
async def obtener_draft(
    resource_type: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    draft = db.query(Draft).filter(
        Draft.resource_type == resource_type,
        Draft.user_id == current_user.id
    ).first()
    return draft


@router.put("/{resource_type}", response_model=DraftResponse)
async def guardar_draft(
    resource_type: str,
    draft_in: DraftCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    draft = db.query(Draft).filter(
        Draft.resource_type == resource_type,
        Draft.user_id == current_user.id
    ).first()

    if draft:
        draft.data = draft_in.data
    else:
        draft = Draft(
            resource_type=resource_type,
            user_id=current_user.id,
            data=draft_in.data
        )
        db.add(draft)

    db.commit()
    db.refresh(draft)
    return draft


@router.delete("/{resource_type}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_draft(
    resource_type: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    draft = db.query(Draft).filter(
        Draft.resource_type == resource_type,
        Draft.user_id == current_user.id
    ).first()

    if draft:
        db.delete(draft)
        db.commit()
