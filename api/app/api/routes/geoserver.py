import hashlib
import re
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import require_project_access, require_role, verify_csrf
from app.api.metrics import COUNTER_GEOSERVER_CALLS, incr
from app.api.rate_limit import rate_limit
from app.core.database import get_dataengine_db
from app.models.layer import Workspace
from app.models.user import Usuario
from app.schemas.geoserver_file import (
    GeoServerBrowseResponse,
    GeoServerFileResponse,
    GeoServerFolderResponse,
    GeoServerSearchResponse,
)
from app.schemas.layer import WorkspaceCreate, WorkspacePending, WorkspaceResponse
from app.services.acervo_file_service import ZIP_MAX_BYTES, stream_zip
from app.services.geoserver_client import GeoServerClient, GeoServerError
from app.services.palette_service import load_palettes
from app.services.sld_parser import parse_sld

router = APIRouter(
    prefix='/geoserver',
    tags=['geoserver'],
    dependencies=[Depends(require_project_access('mapalab'))],
)

_require_project_editor = require_project_access('mapalab', min_role='editor')
_require_admin = require_role(['tetlamamakani'])
_read_rate_limit = rate_limit(max_requests=120, window_seconds=60.0, scope='geoserver_read')
_write_rate_limit = rate_limit(max_requests=60, window_seconds=60.0, scope='geoserver_write')
_download_rate_limit = rate_limit(max_requests=600, window_seconds=60.0, scope='geoserver_download')
_chunk_rate_limit = rate_limit(max_requests=600, window_seconds=60.0, scope='geoserver_chunk')


def _resolve_workspace(db: Session, alias: str) -> Workspace:
    ws = db.query(Workspace).filter(Workspace.alias == alias).first()
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace alias '{alias}' no existe")
    return ws


@router.get('/workspaces')
async def list_workspaces_with_layers(
    available_only: bool = Query(default=False),
    include_unregistered: bool = Query(default=False),
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_read_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    workspaces = db.query(Workspace).order_by(Workspace.alias).all()
    client = GeoServerClient()

    registered_layers: set[tuple[str, str]] = set()
    if available_only:
        from app.models.layer import Layer
        rows = db.query(Layer.workspace_alias, Layer.geoserver_layer).filter(
            Layer.workspace_alias.isnot(None),
            Layer.geoserver_layer.isnot(None),
        ).all()
        registered_layers = {(alias, name) for alias, name in rows}

    result = []
    for ws in workspaces:
        try:
            layers = client.list_layers(ws.geoserver_workspace)
        except GeoServerError:
            layers = []
        except Exception:
            layers = []

        if available_only:
            layers = [name for name in layers if (ws.alias, name) not in registered_layers]

        result.append({
            'alias': ws.alias,
            'geoserverWorkspace': ws.geoserver_workspace,
            'dbSchema': ws.db_schema,
            'label': ws.label,
            'layers': layers,
            'registered': True,
        })

    if include_unregistered:
        registered_geoserver_names = {ws.geoserver_workspace for ws in workspaces}
        try:
            all_geoserver_names = client.list_workspaces()
        except GeoServerError:
            all_geoserver_names = []
        for name in sorted(all_geoserver_names):
            if name in registered_geoserver_names:
                continue
            try:
                layers = client.list_layers(name)
            except GeoServerError:
                layers = []
            if not layers:
                continue
            result.append({
                'alias': None,
                'geoserverWorkspace': name,
                'dbSchema': None,
                'label': None,
                'layers': layers,
                'registered': False,
            })

    return result


@router.get('/workspaces/pending', response_model=list[WorkspacePending])
async def list_pending_workspaces(
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_read_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    registered_names = {
        ws.geoserver_workspace
        for ws in db.query(Workspace.geoserver_workspace).all()
    }
    client = GeoServerClient()
    try:
        all_names = client.list_workspaces()
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    pending: list[WorkspacePending] = []
    for name in all_names:
        if name in registered_names:
            continue
        try:
            layers = client.list_layers(name)
        except GeoServerError:
            layers = []
        pending.append(
            WorkspacePending(geoserver_workspace=name, layer_count=len(layers))
        )
    pending.sort(key=lambda p: p.geoserver_workspace)
    return pending


@router.post(
    '/workspaces/register',
    response_model=WorkspaceResponse,
    status_code=201,
)
async def register_workspace(
    data: WorkspaceCreate,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)

    existing_alias = db.query(Workspace).filter(Workspace.alias == data.alias).first()
    if existing_alias:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe un workspace con alias '{data.alias}'",
        )

    existing_gs = db.query(Workspace).filter(
        Workspace.geoserver_workspace == data.geoserver_workspace
    ).first()
    if existing_gs:
        raise HTTPException(
            status_code=409,
            detail=(
                f"El workspace de GeoServer '{data.geoserver_workspace}' ya esta "
                f"registrado con alias '{existing_gs.alias}'"
            ),
        )

    client = GeoServerClient()
    try:
        all_names = set(client.list_workspaces())
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    if data.geoserver_workspace not in all_names:
        raise HTTPException(
            status_code=400,
            detail=(
                f"El workspace '{data.geoserver_workspace}' no existe en GeoServer"
            ),
        )

    workspace = Workspace(
        alias=data.alias,
        geoserver_workspace=data.geoserver_workspace,
        db_schema=data.db_schema,
        label=data.label,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace


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
        is_global = client.style_is_global(ws.geoserver_workspace, bare_style)
        shared_by = client.find_layers_using_style(ws.geoserver_workspace, bare_style)
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    parsed = parse_sld(raw_xml)
    editable = parsed.editable and not is_global
    reason = parsed.reason
    if is_global:
        reason = (
            'Style global de GeoServer; editarlo afectaria a todos los workspaces '
            'que lo usan. Edita desde el panel de GeoServer o duplicalo como style '
            f"del workspace '{ws.geoserver_workspace}'."
        )
    model_dict = parsed.model.model_dump(by_alias=False) if parsed.model else None
    if parsed.shape == 'point' and model_dict and model_dict.get('point'):
        graphic_url = model_dict['point'].get('graphic_url')
        from app.services.symbol_service import find_symbol_by_graphic_url
        symbol = find_symbol_by_graphic_url(db, graphic_url)
        if symbol is not None:
            model_dict['point']['symbol_id'] = symbol.id
    return {
        'workspace': alias,
        'styleName': bare_style,
        'rawXml': parsed.raw_xml,
        'editable': editable,
        'shape': parsed.shape,
        'reason': reason,
        'model': model_dict,
        'sharedBy': shared_by,
        'isGlobal': is_global,
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


_GEOSERVER_WORKSPACE_RE = re.compile(r'^[a-zA-Z0-9_-]+$')
_GEOSERVER_FILE_SEGMENT_RE = re.compile(r'^[a-zA-Z0-9._-]+$')


def _validate_workspace(workspace: str | None) -> str | None:
    if workspace is None or workspace == '':
        return None
    workspace = workspace.strip()
    if not _GEOSERVER_WORKSPACE_RE.match(workspace):
        raise HTTPException(
            status_code=400,
            detail="Workspace invalido: solo letras, numeros, guion y guion bajo",
        )
    return workspace
_GEOSERVER_FILE_ALLOWED_EXT = {'svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'tif'}
_GEOSERVER_FILE_MAX_BYTES = 5 * 1024 * 1024
_GEOSERVER_FILE_MIME_BY_EXT = {
    'svg': 'image/svg+xml',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
}


def _validate_file_name(name: str) -> tuple[str, str]:
    if not name:
        raise HTTPException(status_code=400, detail="Nombre vacio")
    if '..' in name or name.startswith('/') or name.endswith('/'):
        raise HTTPException(status_code=400, detail="Nombre invalido (path traversal)")
    for seg in name.split('/'):
        if not _GEOSERVER_FILE_SEGMENT_RE.match(seg):
            raise HTTPException(
                status_code=400,
                detail=f"Segmento invalido '{seg}': solo letras, numeros, guion, guion bajo y punto",
            )
    ext = Path(name).suffix.lower().lstrip('.')
    if ext not in _GEOSERVER_FILE_ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"Extension '.{ext}' no permitida. Soportadas: {sorted(_GEOSERVER_FILE_ALLOWED_EXT)}",
        )
    return name, ext


def _build_file_response(name: str, content_type: str | None, workspace: str | None = None) -> GeoServerFileResponse:
    ext = Path(name).suffix.lower().lstrip('.')
    fmt = content_type or _GEOSERVER_FILE_MIME_BY_EXT.get(ext, 'application/octet-stream')
    snippet = (
        '<ExternalGraphic xmlns="http://www.opengis.net/sld">'
        f'<OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'xlink:type="simple" xlink:href="{name}"/>'
        f'<Format>{fmt}</Format>'
        '</ExternalGraphic>'
    )
    ws_qs = f"?workspace={workspace}" if workspace else ""
    return GeoServerFileResponse(
        name=name,
        content_type=content_type,
        download_url=f"/api/administrador/geoserver/files/{name}{ws_qs}",
        sld_snippet=snippet,
        workspace=workspace,
    )


def _validate_folder_path(path: str) -> str:
    if not path:
        return ""
    if '..' in path or path.startswith('/') or path.endswith('/'):
        raise HTTPException(status_code=400, detail="Path invalido (path traversal)")
    for seg in path.split('/'):
        if not _GEOSERVER_FILE_SEGMENT_RE.match(seg):
            raise HTTPException(
                status_code=400,
                detail=f"Segmento invalido '{seg}': solo letras, numeros, guion, guion bajo y punto",
            )
    return path


@router.get('/files', response_model=GeoServerBrowseResponse)
async def browse_geoserver_files(
    path: str = Query(default=''),
    workspace: str | None = Query(default=None),
    current_user: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_read_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    clean_path = _validate_folder_path(path.strip().strip('/'))
    clean_ws = _validate_workspace(workspace)
    client = GeoServerClient()
    try:
        result = client.browse_styles_dir(clean_path, workspace=clean_ws)
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    folders = sorted(
        (
            GeoServerFolderResponse(
                name=full_path.rsplit('/', 1)[-1],
                path=full_path,
            )
            for full_path in result['folders']
        ),
        key=lambda f: f.name.lower(),
    )
    files = sorted(
        (
            _build_file_response(it['name'], it.get('content_type'), workspace=clean_ws)
            for it in result['files']
            if Path(it['name']).suffix.lower().lstrip('.') in _GEOSERVER_FILE_ALLOWED_EXT
        ),
        key=lambda f: f.name.lower(),
    )
    return GeoServerBrowseResponse(path=clean_path, workspace=clean_ws, folders=folders, files=files)


@router.get('/files/search', response_model=GeoServerSearchResponse)
async def search_geoserver_files(
    q: str = Query(..., min_length=1, max_length=200),
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_read_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    needle = q.strip().lower()
    if not needle:
        return GeoServerSearchResponse(query=q, results=[], truncated=False)

    client = GeoServerClient()
    workspaces = [None] + [
        ws.geoserver_workspace for ws in db.query(Workspace).order_by(Workspace.alias).all()
    ]

    limit = 500
    results: list[GeoServerFileResponse] = []
    truncated = False
    for ws in workspaces:
        if len(results) >= limit:
            truncated = True
            break
        try:
            items = client.list_all_style_files(workspace=ws)
        except GeoServerError:
            continue
        for it in items:
            name = it['name']
            ext = Path(name).suffix.lower().lstrip('.')
            if ext not in _GEOSERVER_FILE_ALLOWED_EXT:
                continue
            if needle not in name.lower():
                continue
            results.append(_build_file_response(name, it.get('content_type'), workspace=ws))
            if len(results) >= limit:
                truncated = True
                break

    results.sort(key=lambda f: ((f.workspace or '').lower(), f.name.lower()))
    return GeoServerSearchResponse(query=q, results=results, truncated=truncated)


@router.post('/files', response_model=GeoServerFileResponse, status_code=201)
async def upload_geoserver_file(
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    workspace: str | None = Form(default=None),
    current_user: Usuario = Depends(_require_project_editor),
    _csrf: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    clean_ws = _validate_workspace(workspace)
    target_name = name or file.filename or ''
    target_name = target_name.strip()
    target_name, ext = _validate_file_name(target_name)

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Archivo vacio")
    if len(content) > _GEOSERVER_FILE_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Archivo excede el limite ({_GEOSERVER_FILE_MAX_BYTES} bytes)",
        )

    content_type = _GEOSERVER_FILE_MIME_BY_EXT[ext]
    client = GeoServerClient()
    try:
        client.put_style_file(target_name, content, content_type, workspace=clean_ws)
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return _build_file_response(target_name, content_type, workspace=clean_ws)


@router.post('/files/chunked/init', status_code=201)
async def init_chunked_geoserver_upload(
    name: str = Form(...),
    workspace: str | None = Form(default=None),
    content_type: str | None = Form(default=None),
    total_size: int = Form(...),
    total_chunks: int = Form(...),
    current_user: Usuario = Depends(_require_project_editor),
    _csrf: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    from app.services.geoserver_chunked import (
        CHUNK_SIZE,
        MAX_TOTAL_BYTES,
        create_session,
    )

    incr(COUNTER_GEOSERVER_CALLS)
    clean_ws = _validate_workspace(workspace)
    target_name, ext = _validate_file_name((name or '').strip())
    if total_size <= 0:
        raise HTTPException(status_code=400, detail="Tamano invalido")
    if total_size > MAX_TOTAL_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Archivo excede el limite ({MAX_TOTAL_BYTES // (1024 * 1024)} MB)",
        )
    if total_chunks < 1:
        raise HTTPException(status_code=400, detail="total_chunks invalido")

    resolved_ct = content_type or _GEOSERVER_FILE_MIME_BY_EXT[ext]
    session_id = create_session({
        'name': target_name,
        'workspace': clean_ws,
        'content_type': resolved_ct,
        'total_size': total_size,
        'total_chunks': total_chunks,
    })
    return {'session_id': session_id, 'chunk_size': CHUNK_SIZE}


@router.post('/files/chunked/{session_id}/part')
async def upload_chunked_geoserver_part(
    session_id: str,
    chunk: UploadFile = File(...),
    part_number: int = Form(...),
    current_user: Usuario = Depends(_require_project_editor),
    _csrf: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_chunk_rate_limit),
):
    from app.services.geoserver_chunked import get_session, store_part

    incr(COUNTER_GEOSERVER_CALLS)
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesion de subida no encontrada o expirada")
    if part_number < 1 or part_number > session['total_chunks']:
        raise HTTPException(status_code=400, detail="part_number fuera de rango")

    data = await chunk.read()
    if not data:
        raise HTTPException(status_code=400, detail="Parte vacia")
    store_part(session_id, part_number, data)
    return {'part_number': part_number}


@router.post('/files/chunked/{session_id}/complete', response_model=GeoServerFileResponse, status_code=201)
async def complete_chunked_geoserver_upload(
    session_id: str,
    current_user: Usuario = Depends(_require_project_editor),
    _csrf: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    from app.services.geoserver_chunked import (
        delete_session,
        get_session,
        iter_parts,
        missing_parts,
    )

    incr(COUNTER_GEOSERVER_CALLS)
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesion de subida no encontrada o expirada")

    total_chunks = session['total_chunks']
    missing = missing_parts(session_id, total_chunks)
    if missing:
        raise HTTPException(status_code=400, detail=f"Faltan partes: {missing}")

    name = session['name']
    clean_ws = session.get('workspace')
    content_type = session['content_type']
    total_size = session['total_size']

    client = GeoServerClient()
    try:
        client.put_style_file_streaming(
            name,
            iter_parts(session_id, total_chunks),
            content_type,
            total_size,
            workspace=clean_ws,
        )
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    delete_session(session_id, total_chunks)
    return _build_file_response(name, content_type, workspace=clean_ws)


@router.get('/files/zip')
async def download_geoserver_folder_zip(
    path: str = Query(default=''),
    workspace: str | None = Query(default=None),
    current_user: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_download_rate_limit),
):
    """Descarga ZIP streaming de una carpeta de `styles/` recursivamente."""
    import io as _io

    incr(COUNTER_GEOSERVER_CALLS)
    clean_path = _validate_folder_path(path.strip().strip('/'))
    clean_ws = _validate_workspace(workspace)
    client = GeoServerClient()
    items: list[dict] = []
    try:
        client._walk_styles_recursive(clean_path, clean_ws, items)
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    if not items:
        raise HTTPException(status_code=404, detail="Carpeta vacia o no encontrada")

    base_strip = f"{clean_path}/" if clean_path else ""

    # Eagerly fetch para validar tamaño total antes de iniciar streaming.
    # Trade-off: usa RAM hasta 500MB; OK para la mayoria de carpetas SLD.
    total = 0
    fetched: list[tuple[str, bytes]] = []
    for it in items:
        name = it['name']
        try:
            content, _ = client.get_style_file_bytes(name, workspace=clean_ws)
        except GeoServerError:
            continue
        total += len(content)
        if total > ZIP_MAX_BYTES:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"Carpeta excede el limite de {ZIP_MAX_BYTES // (1024 * 1024)} MB. "
                    "Descarga subcarpetas individuales."
                ),
            )
        arcname = name[len(base_strip):] if base_strip and name.startswith(base_strip) else name
        fetched.append((arcname, content))

    folder_label = clean_path.split("/")[-1] if clean_path else (clean_ws or "global")
    safe_label = "".join(c if c.isalnum() or c in "._-" else "_" for c in folder_label) or "geoserver"
    zip_filename = f"{safe_label}.zip"

    def _entries():
        for arcname, content in fetched:
            yield arcname, lambda c=content: _io.BytesIO(c)

    return StreamingResponse(
        stream_zip(_entries()),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.get('/files/{name:path}')
async def download_geoserver_file(
    name: str,
    workspace: str | None = Query(default=None),
    current_user: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_download_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    _validate_file_name(name)
    clean_ws = _validate_workspace(workspace)
    client = GeoServerClient()
    try:
        content, content_type = client.get_style_file_bytes(name, workspace=clean_ws)
    except GeoServerError as exc:
        if 'no encontrado' in str(exc).lower():
            raise HTTPException(status_code=404, detail=str(exc))
        raise HTTPException(status_code=502, detail=str(exc))
    return Response(
        content=content,
        media_type=content_type or 'application/octet-stream',
        headers={
            'Cache-Control': 'public, max-age=86400, immutable',
            'ETag': f'"{hashlib.md5(content).hexdigest()}"',
        },
    )


@router.delete('/files/{name:path}', status_code=204)
async def delete_geoserver_file(
    name: str,
    workspace: str | None = Query(default=None),
    current_user: Usuario = Depends(_require_project_editor),
    _csrf: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    incr(COUNTER_GEOSERVER_CALLS)
    _validate_file_name(name)
    clean_ws = _validate_workspace(workspace)
    client = GeoServerClient()
    try:
        deleted = client.delete_style_file(name, workspace=clean_ws)
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    if not deleted:
        base = f"workspaces/{clean_ws}/styles" if clean_ws else "styles"
        raise HTTPException(status_code=404, detail=f"Recurso no existe: {base}/{name}")
