from fastapi import APIRouter, Body, Depends

from app.api.deps import verify_csrf
from app.models.user import Usuario
from app.services import mapalab_shares as service

router = APIRouter(prefix="/mapalab-shares", tags=["mapalab shares"])


@router.post("")
async def crear_share_permanente(
    body: dict = Body(...),
    _csrf: Usuario = Depends(verify_csrf),
):
    envelope = body.get('envelope') or body
    permanent = bool(body.get('permanent', False))

    created = service.create_share(envelope)
    share_id = created.get('id')

    if permanent and share_id:
        service.pin_permanent(share_id)
        created['permanent'] = True
        created['pinned_until'] = '9999-12-31T00:00:00Z'

    return created


@router.post("/{share_id}/pin-permanent")
async def pin_permanent_share(
    share_id: str,
    _csrf: Usuario = Depends(verify_csrf),
):
    result = service.pin_permanent(share_id)
    return result


@router.delete("/{share_id}/pin-permanent", status_code=204)
async def unpin_permanent_share(
    share_id: str,
    _csrf: Usuario = Depends(verify_csrf),
):
    service.unpin_permanent(share_id)
    return None
