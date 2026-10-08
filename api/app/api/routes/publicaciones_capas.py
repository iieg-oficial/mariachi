from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, verify_csrf
from app.core.database import get_dataengine_db
from app.models.user import Usuario
from app.schemas.publicacion_capa import PublicacionCapaResponse
from app.services import publicaciones_capas as publicaciones
from app.services.layer_keys import canonical_layer_key

router = APIRouter(prefix="/publicaciones-capas", tags=["publicaciones-capas"])

_require_manage = require_permission('mariachi.mapalab.manage')


@router.get("/ultimas", response_model=list[PublicacionCapaResponse])
async def ultimas_publicaciones(
    layer_id: str | None = Query(default=None),
    layer_key: str | None = Query(default=None),
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    _user: Usuario = Depends(_require_manage),
):
    recursos: list[tuple[str, str]] = []
    if layer_id:
        recursos.append(('layer', layer_id))
    if layer_key:
        clave = canonical_layer_key(dataengine_db, layer_key)
        recursos += [('layer_metadata', clave), ('layer_stats', clave)]
    return publicaciones.ultimas(db, recursos)


@router.post("/{publicacion_id}/deshacer", response_model=PublicacionCapaResponse)
async def deshacer_publicacion(
    publicacion_id: int,
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_manage),
):
    return publicaciones.deshacer(db, dataengine_db, publicacion_id, publicaciones.quien(current_user))
