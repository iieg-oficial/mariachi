from __future__ import annotations

import logging
from datetime import datetime
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, verify_csrf
from app.core.settings import get_settings
from app.models.user import Usuario
from app.schemas.mapalab_event import (
    ButtonStatRow,
    DailyStatRow,
    EventoStatRow,
    HighlightLayer,
    HighlightTool,
    LayerStatRow,
    SessionRow,
    SessionsPage,
    StatsHighlights,
    StatsOverview,
    ToolStatRow,
)
from app.schemas.mapalab_mcp import (
    McpClientStatRow,
    McpDailyStatRow,
    McpStatsOverview,
    McpToolStatRow,
)
from app.services.mapalab_telemetry import refresh_stats_views

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mapalab-stats", tags=["mapalab stats"])
settings = get_settings()


@router.get("/overview", response_model=StatsOverview, response_model_by_alias=True)
async def overview(
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    row = db.execute(text("SELECT * FROM mapalab_stats_overview LIMIT 1")).mappings().first()
    if row is None:
        return StatsOverview(
            sessions_30d=0, sessions_7d=0, sessions_1d=0, events_30d=0,
            avg_duration_sec=0, swipe_sessions_30d=0, drawing_sessions_30d=0,
            download_sessions_30d=0, share_sessions_30d=0,
        )
    return StatsOverview(
        sessions_30d=row["sessions_30d"] or 0,
        sessions_7d=row["sessions_7d"] or 0,
        sessions_1d=row["sessions_1d"] or 0,
        events_30d=row["events_30d"] or 0,
        avg_duration_sec=row["avg_duration_sec"] or 0,
        swipe_sessions_30d=row["swipe_sessions_30d"] or 0,
        drawing_sessions_30d=row["drawing_sessions_30d"] or 0,
        download_sessions_30d=row["download_sessions_30d"] or 0,
        share_sessions_30d=row["share_sessions_30d"] or 0,
    )


async def _fetch_layer_labels(layer_ids: list[str]) -> dict[str, dict]:
    if not layer_ids or not settings.mapalab_backend_url:
        return {}
    url = f"{settings.mapalab_backend_url.rstrip('/')}/layers/tree"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            tree = resp.json()
    except Exception:
        logger.warning("mapalab_stats.fetch_tree_failed", exc_info=True)
        return {}

    out: dict[str, dict] = {}

    def walk(node: dict):
        if not isinstance(node, dict):
            return
        nid = node.get("id")
        if nid in layer_ids:
            wms = node.get("wmsConfig") or {}
            out[nid] = {
                "label": node.get("label"),
                "workspace": wms.get("workspace") or node.get("workspace"),
            }
        for child in node.get("children") or []:
            walk(child)

    if isinstance(tree, list):
        for n in tree:
            walk(n)
    elif isinstance(tree, dict):
        walk(tree)
    return out


@router.get("/layers", response_model=list[LayerStatRow], response_model_by_alias=True)
async def top_layers(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT layer_id, activations, downloads, feature_clicks,
                   detail_opens, opacity_changes, unique_sessions, last_seen
            FROM mapalab_stats_layers
            ORDER BY activations DESC, unique_sessions DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).mappings().all()

    layer_ids = [r["layer_id"] for r in rows]
    labels = await _fetch_layer_labels(layer_ids)

    return [
        LayerStatRow(
            layer_id=r["layer_id"],
            activations=r["activations"] or 0,
            downloads=r["downloads"] or 0,
            feature_clicks=r["feature_clicks"] or 0,
            detail_opens=r["detail_opens"] or 0,
            opacity_changes=r["opacity_changes"] or 0,
            unique_sessions=r["unique_sessions"] or 0,
            last_seen=r["last_seen"],
            label=(labels.get(r["layer_id"]) or {}).get("label"),
            workspace=(labels.get(r["layer_id"]) or {}).get("workspace"),
        )
        for r in rows
    ]


@router.get("/eventos", response_model=list[EventoStatRow], response_model_by_alias=True)
async def top_eventos(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT evento_id, titulo, opens, closes, unique_sessions, last_seen
            FROM mapalab_stats_eventos
            ORDER BY opens DESC, unique_sessions DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).mappings().all()

    ids: list[int] = []
    for r in rows:
        try:
            ids.append(int(r["evento_id"]))
        except (TypeError, ValueError):
            continue

    titulos: dict[str, str] = {}
    if ids:
        stmt = text("SELECT id, titulo FROM eventos WHERE id IN :ids").bindparams(
            bindparam("ids", expanding=True)
        )
        for ev_id, titulo in db.execute(stmt, {"ids": ids}).all():
            titulos[str(ev_id)] = titulo

    return [
        EventoStatRow(
            evento_id=r["evento_id"],
            titulo=titulos.get(r["evento_id"]) or r["titulo"],
            opens=r["opens"] or 0,
            closes=r["closes"] or 0,
            unique_sessions=r["unique_sessions"] or 0,
            last_seen=r["last_seen"],
        )
        for r in rows
    ]


@router.get("/buttons", response_model=list[ButtonStatRow], response_model_by_alias=True)
async def buttons(
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT event_name, clicks, unique_sessions
            FROM mapalab_stats_buttons
            ORDER BY clicks DESC
            """
        )
    ).mappings().all()
    return [
        ButtonStatRow(
            event_name=r["event_name"],
            clicks=r["clicks"] or 0,
            unique_sessions=r["unique_sessions"] or 0,
        )
        for r in rows
    ]


@router.get("/tools", response_model=list[ToolStatRow], response_model_by_alias=True)
async def tools(
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT event_name, tool, uses, unique_sessions
            FROM mapalab_stats_tools
            ORDER BY uses DESC
            """
        )
    ).mappings().all()
    return [
        ToolStatRow(
            event_name=r["event_name"],
            tool=r["tool"] or "unknown",
            uses=r["uses"] or 0,
            unique_sessions=r["unique_sessions"] or 0,
        )
        for r in rows
    ]


@router.get("/daily", response_model=list[DailyStatRow], response_model_by_alias=True)
async def daily(
    days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT dia, source, sessions, events,
                   sessions_swipe, sessions_drawing, sessions_measurement,
                   sessions_downloaded, sessions_shared, sessions_reported,
                   avg_duration_sec
            FROM mapalab_stats_daily
            WHERE dia >= CURRENT_DATE - :days * INTERVAL '1 day'
            ORDER BY dia ASC, source ASC
            """
        ),
        {"days": days},
    ).mappings().all()
    return [
        DailyStatRow(
            dia=str(r["dia"]),
            source=r["source"],
            sessions=r["sessions"] or 0,
            events=r["events"] or 0,
            sessions_swipe=r["sessions_swipe"] or 0,
            sessions_drawing=r["sessions_drawing"] or 0,
            sessions_measurement=r["sessions_measurement"] or 0,
            sessions_downloaded=r["sessions_downloaded"] or 0,
            sessions_shared=r["sessions_shared"] or 0,
            sessions_reported=r["sessions_reported"] or 0,
            avg_duration_sec=r["avg_duration_sec"] or 0,
        )
        for r in rows
    ]


@router.get("/sessions", response_model=SessionsPage, response_model_by_alias=True)
async def sessions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    source: Literal["visor", "embed", "widget", "all"] = Query(default="all"),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    where = "WHERE 1=1"
    params: dict = {"limit": page_size, "offset": (page - 1) * page_size}
    if source != "all":
        where += " AND source = :source"
        params["source"] = source

    total = db.execute(
        text(f"SELECT COUNT(*) FROM mapalab_sessions {where}"),
        {k: v for k, v in params.items() if k not in {"limit", "offset"}},
    ).scalar() or 0

    rows = db.execute(
        text(
            f"""
            SELECT session_id, started_at, last_seen_at, source, events_count,
                   duration_sec, layers_activated, used_swipe, used_drawing,
                   downloaded, shared, reported, ua_family, referrer
            FROM mapalab_sessions
            {where}
            ORDER BY started_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).mappings().all()

    items = [
        SessionRow(
            session_id=str(r["session_id"]),
            started_at=r["started_at"],
            last_seen_at=r["last_seen_at"],
            source=r["source"],
            events_count=r["events_count"] or 0,
            duration_sec=r["duration_sec"] or 0,
            layers_activated=r["layers_activated"] or 0,
            used_swipe=bool(r["used_swipe"]),
            used_drawing=bool(r["used_drawing"]),
            downloaded=bool(r["downloaded"]),
            shared=bool(r["shared"]),
            reported=bool(r["reported"]),
            ua_family=r["ua_family"],
            referrer=r["referrer"],
        )
        for r in rows
    ]
    return SessionsPage(items=items, total=total, page=page, page_size=page_size)


@router.get("/highlights", response_model=StatsHighlights, response_model_by_alias=True)
async def highlights(
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    overview_row = db.execute(text("SELECT * FROM mapalab_stats_overview LIMIT 1")).mappings().first()
    top_layer_row = db.execute(
        text(
            """
            SELECT layer_id, activations
            FROM mapalab_stats_layers
            ORDER BY activations DESC, unique_sessions DESC
            LIMIT 1
            """
        )
    ).mappings().first()
    top_tool_row = db.execute(
        text(
            """
            SELECT tool, uses
            FROM mapalab_stats_tools
            ORDER BY uses DESC
            LIMIT 1
            """
        )
    ).mappings().first()

    top_layer = None
    if top_layer_row and top_layer_row["layer_id"]:
        labels = await _fetch_layer_labels([top_layer_row["layer_id"]])
        top_layer = HighlightLayer(
            layer_id=top_layer_row["layer_id"],
            label=(labels.get(top_layer_row["layer_id"]) or {}).get("label"),
            activations=top_layer_row["activations"] or 0,
        )

    top_tool = None
    if top_tool_row and top_tool_row["tool"]:
        top_tool = HighlightTool(tool=top_tool_row["tool"], uses=top_tool_row["uses"] or 0)

    return StatsHighlights(
        sessions_30d=(overview_row or {}).get("sessions_30d") or 0,
        avg_duration_sec=(overview_row or {}).get("avg_duration_sec") or 0,
        top_layer=top_layer,
        top_tool=top_tool,
    )


@router.get("/mcp/overview", response_model=McpStatsOverview, response_model_by_alias=True)
async def mcp_overview(
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    row = db.execute(text("SELECT * FROM mapalab_mcp_stats_overview LIMIT 1")).mappings().first()
    if row is None:
        return McpStatsOverview()
    return McpStatsOverview(
        calls_30d=row["calls_30d"] or 0,
        calls_7d=row["calls_7d"] or 0,
        calls_1d=row["calls_1d"] or 0,
        errors_30d=row["errors_30d"] or 0,
        sessions_30d=row["sessions_30d"] or 0,
        clients_30d=row["clients_30d"] or 0,
        avg_tool_duration_ms=row["avg_tool_duration_ms"] or 0,
        tool_calls_30d=row["tool_calls_30d"] or 0,
    )


@router.get("/mcp/tools", response_model=list[McpToolStatRow], response_model_by_alias=True)
async def mcp_tools(
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT tool, uses, errors, unique_sessions, avg_duration_ms, p95_duration_ms, last_seen
            FROM mapalab_mcp_stats_tools
            ORDER BY uses DESC, last_seen DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).mappings().all()
    return [
        McpToolStatRow(
            tool=r["tool"],
            uses=r["uses"] or 0,
            errors=r["errors"] or 0,
            unique_sessions=r["unique_sessions"] or 0,
            avg_duration_ms=r["avg_duration_ms"] or 0,
            p95_duration_ms=r["p95_duration_ms"] or 0,
            last_seen=r["last_seen"],
        )
        for r in rows
    ]


@router.get("/mcp/daily", response_model=list[McpDailyStatRow], response_model_by_alias=True)
async def mcp_daily(
    days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT dia, calls, tool_calls, errors, unique_sessions, avg_duration_ms
            FROM mapalab_mcp_stats_daily
            WHERE dia >= CURRENT_DATE - :days * INTERVAL '1 day'
            ORDER BY dia ASC
            """
        ),
        {"days": days},
    ).mappings().all()
    return [
        McpDailyStatRow(
            dia=str(r["dia"]),
            calls=r["calls"] or 0,
            tool_calls=r["tool_calls"] or 0,
            errors=r["errors"] or 0,
            unique_sessions=r["unique_sessions"] or 0,
            avg_duration_ms=r["avg_duration_ms"] or 0,
        )
        for r in rows
    ]


@router.get("/mcp/clients", response_model=list[McpClientStatRow], response_model_by_alias=True)
async def mcp_clients(
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT client_name, client_version, calls, unique_sessions, last_seen
            FROM mapalab_mcp_stats_clients
            ORDER BY calls DESC, last_seen DESC
            """
        )
    ).mappings().all()
    return [
        McpClientStatRow(
            client_name=r["client_name"],
            client_version=r["client_version"] or "",
            calls=r["calls"] or 0,
            unique_sessions=r["unique_sessions"] or 0,
            last_seen=r["last_seen"],
        )
        for r in rows
    ]


@router.post("/refresh", dependencies=[Depends(verify_csrf)])
async def refresh(
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    if current.role != "tetlamamakani":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradoras pueden refrescar vistas",
        )
    refreshed = refresh_stats_views(db, concurrent=True)
    return {"ok": True, "refreshed": refreshed, "ts": datetime.utcnow().isoformat()}
