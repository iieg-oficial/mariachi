from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import require_project_access
from app.api.metrics import COUNTER_GEOSERVER_CALLS, incr
from app.api.rate_limit import rate_limit
from app.core.database import get_dataengine_db
from app.models.layer import Workspace
from app.models.user import Usuario
from app.services.geoserver_client import GeoServerClient, GeoServerError
from app.services.palette_service import load_palettes
from app.services.sld_parser import parse_sld

router = APIRouter(
    prefix='/geoserver',
    tags=['geoserver'],
    dependencies=[Depends(require_project_access('mapalab'))],
)

_require_project_editor = require_project_access('mapalab', min_role='editor')
_read_rate_limit = rate_limit(max_requests=120, window_seconds=60.0)


def _resolve_workspace(db: Session, alias: str) -> Workspace:
    ws = db.query(Workspace).filter(Workspace.alias == alias).first()
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace alias '{alias}' no existe")
    return ws


@router.get('/workspaces')
async def list_workspaces_with_layers(
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
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
    current_user: Usuario = Depends(_require_project_editor),
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
    current_user: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_read_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    ws = _resolve_workspace(db, alias)
    client = GeoServerClient()
    try:
        styles = client.list_styles(ws.geoserver_workspace, layer)
        is_group = False
        if not styles:
            try:
                is_group = client.is_layer_group(ws.geoserver_workspace, layer)
            except GeoServerError:
                is_group = False
        return {'styles': styles, 'isLayerGroup': is_group}
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


def _strip_workspace_prefix(style_name: str, geoserver_workspace: str) -> str:
    if ':' not in style_name:
        return style_name
    prefix, _, bare = style_name.partition(':')
    if prefix != geoserver_workspace:
        raise HTTPException(
            status_code=400,
            detail=(
                f"El style '{style_name}' está calificado con el workspace '{prefix}', "
                f"pero el alias resolvió a '{geoserver_workspace}'."
            ),
        )
    return bare


@router.get('/styles/{alias}/{style_name:path}')
async def get_style_sld(
    alias: str,
    style_name: str,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_read_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    ws = _resolve_workspace(db, alias)
    bare_style = _strip_workspace_prefix(style_name, ws.geoserver_workspace)
    client = GeoServerClient()
    try:
        raw_xml = client.get_sld(ws.geoserver_workspace, bare_style)
        shared_by = client.find_layers_using_style(ws.geoserver_workspace, bare_style)
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    parsed = parse_sld(raw_xml)
    return {
        'workspace': alias,
        'styleName': bare_style,
        'rawXml': parsed.raw_xml,
        'editable': parsed.editable,
        'shape': parsed.shape,
        'reason': parsed.reason,
        'model': parsed.model.model_dump(by_alias=False) if parsed.model else None,
        'sharedBy': shared_by,
    }


@router.get('/palettes')
async def list_palettes(
    current_user: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_read_rate_limit),
):
    return {'palettes': load_palettes()}


@router.get('/legend/{alias}/{layer}/{style_name:path}')
async def get_legend(
    alias: str,
    layer: str,
    style_name: str,
    width: int = Query(default=20, ge=8, le=64),
    height: int = Query(default=20, ge=8, le=64),
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_read_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    ws = _resolve_workspace(db, alias)
    if ':' in style_name:
        prefix, _, bare = style_name.partition(':')
        if prefix == ws.geoserver_workspace:
            style_name = bare
    client = GeoServerClient()
    try:
        content, content_type = client.get_legend_graphic(
            ws.geoserver_workspace, layer, style_name, width=width, height=height,
        )
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return Response(content=content, media_type=content_type)
