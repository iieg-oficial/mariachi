from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_project_access, require_role
from app.api.metrics import COUNTER_GEOSERVER_CALLS, incr
from app.api.rate_limit import rate_limit
from app.core.database import get_dataengine_db
from app.models.layer import Workspace
from app.models.user import Usuario
from app.services.geoserver_client import GeoServerClient, GeoServerError

router = APIRouter(
    prefix='/geoserver',
    tags=['geoserver'],
    dependencies=[Depends(require_project_access('mapalab'))],
)

_require_editor_or_admin = require_role(['tetlamamakani', 'editora'])
_read_rate_limit = rate_limit(max_requests=120, window_seconds=60.0)


def _resolve_workspace(db: Session, alias: str) -> Workspace:
    ws = db.query(Workspace).filter(Workspace.alias == alias).first()
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace alias '{alias}' no existe")
    return ws


@router.get('/workspaces')
async def list_workspaces_with_layers(
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_editor_or_admin),
    _rl: Usuario = Depends(_read_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    workspaces = db.query(Workspace).order_by(Workspace.alias).all()
    client = GeoServerClient()

    result = []
    for ws in workspaces:
        try:
            layers = client.list_layers(ws.geoserver_workspace)
        except GeoServerError:
            layers = []
        except Exception:
            layers = []

        result.append({
            'alias': ws.alias,
            'geoserverWorkspace': ws.geoserver_workspace,
            'dbSchema': ws.db_schema,
            'label': ws.label,
            'layers': layers,
        })
    return result


@router.get('/workspaces/{alias}/layers/{layer}/fields')
async def list_fields(
    alias: str,
    layer: str,
    include_samples: bool = Query(default=False),
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_editor_or_admin),
    _rl: Usuario = Depends(_read_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    ws = _resolve_workspace(db, alias)
    client = GeoServerClient()
    try:
        fields = client.list_fields(ws.geoserver_workspace, layer)
        response = {
            'workspace': alias,
            'layer': layer,
            'fields': fields,
        }
        if include_samples:
            samples: dict[str, list] = {}
            for f in fields:
                if f['type'] in ('string', 'integer', 'number') and f['name']:
                    try:
                        samples[f['name']] = client.sample_values(
                            ws.geoserver_workspace, layer, f['name'], limit=10
                        )
                    except Exception:
                        samples[f['name']] = []
            response['sampleValues'] = samples
        return response
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get('/workspaces/{alias}/layers/{layer}/styles')
async def list_styles(
    alias: str,
    layer: str,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_editor_or_admin),
    _rl: Usuario = Depends(_read_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    ws = _resolve_workspace(db, alias)
    client = GeoServerClient()
    try:
        styles = client.list_styles(ws.geoserver_workspace, layer)
        return {'styles': styles}
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
