from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
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
    ThemeStatRow,
    ToolStatRow,
)
from app.schemas.mapalab_mcp import (
    McpClientStatRow,
    McpDailyStatRow,
    McpStatsOverview,
    McpToolStatRow,
)
from app.services.mapalab_telemetry import rollup_stats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mapalab-stats", tags=["mapalab stats"])
settings = get_settings()

Grain = Literal["day", "month", "year"]
_GRAIN_FORMAT = {"day": "YYYY-MM-DD", "month": "YYYY-MM", "year": "YYYY"}


class Period:
    """Rango y granularidad seleccionados, derivados de los query params."""

    def __init__(self, df: date, dt: date, grain: Grain, app: str = "mapalab"):
        self.df = df
        self.dt = dt
        self.grain = grain
        self.app = app

    @property
    def range_params(self) -> dict:
        return {"df": self.df, "dt": self.dt, "app": self.app}

    @property
    def bucket_sql(self) -> str:
        return f"to_char(dia, '{_GRAIN_FORMAT[self.grain]}')"


def get_period(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    grain: Grain = Query(default="day"),
    app: str = Query(default="mapalab"),
) -> Period:
    today = date.today()
    try:
        df = date.fromisoformat(date_from) if date_from else today - timedelta(days=29)
    except ValueError:
        df = today - timedelta(days=29)
    try:
        dt = date.fromisoformat(date_to) if date_to else today
    except ValueError:
        dt = today
    if df > dt:
        df, dt = dt, df
    return Period(df, dt, grain, app)


_APP_LABELS = {"mapalab": "MapaLab"}


@router.get("/apps")
async def apps(
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text("SELECT DISTINCT app FROM huachicol.events ORDER BY app")
    ).scalars().all()
    disponibles = list(rows) or ["mapalab"]
    return [{"key": a, "label": _APP_LABELS.get(a, a.capitalize())} for a in disponibles]


@router.get("/overview", response_model=StatsOverview, response_model_by_alias=True)
async def overview(
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    row = db.execute(
        text(
            """
            SELECT
                COALESCE(SUM(sessions), 0) AS sessions,
                COALESCE(SUM(events), 0) AS events,
                CASE WHEN SUM(sessions) > 0
                     THEN (SUM(dur_sum) / SUM(sessions))::int ELSE 0 END AS avg_duration_sec,
                COALESCE(SUM(swipe), 0) AS swipe_sessions,
                COALESCE(SUM(drawing), 0) AS drawing_sessions,
                COALESCE(SUM(downloaded), 0) AS download_sessions,
                COALESCE(SUM(shared), 0) AS share_sessions,
                COALESCE(SUM(reported), 0) AS reported_sessions
            FROM huachicol.rollup_daily
            WHERE dia BETWEEN :df AND :dt AND app = :app
            """
        ),
        period.range_params,
    ).mappings().first()
    if row is None:
        return StatsOverview(
            sessions=0, events=0, avg_duration_sec=0, swipe_sessions=0,
            drawing_sessions=0, download_sessions=0, share_sessions=0,
            reported_sessions=0,
        )
    return StatsOverview(
        sessions=row["sessions"] or 0,
        events=row["events"] or 0,
        avg_duration_sec=row["avg_duration_sec"] or 0,
        swipe_sessions=row["swipe_sessions"] or 0,
        drawing_sessions=row["drawing_sessions"] or 0,
        download_sessions=row["download_sessions"] or 0,
        share_sessions=row["share_sessions"] or 0,
        reported_sessions=row["reported_sessions"] or 0,
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

    def walk(node: dict, parent_id: str | None = None):
        if not isinstance(node, dict):
            return
        nid = node.get("id")
        if nid in layer_ids:
            wms = node.get("wmsConfig") or {}
            out[nid] = {
                "label": node.get("label"),
                "workspace": wms.get("workspace") or node.get("workspace"),
                "parent_id": parent_id,
                "nodeType": node.get("nodeType"),
            }
        for child in node.get("children") or []:
            walk(child, nid)

    if isinstance(tree, list):
        for n in tree:
            walk(n)
    elif isinstance(tree, dict):
        walk(tree)
    return out


@router.get("/layers", response_model=list[LayerStatRow], response_model_by_alias=True)
async def top_layers(
    limit: int = Query(default=20, ge=1, le=100),
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT layer_id,
                   SUM(activations) AS activations,
                   SUM(downloads) AS downloads,
                   SUM(feature_clicks) AS feature_clicks,
                   SUM(detail_opens) AS detail_opens,
                   SUM(opacity_changes) AS opacity_changes,
                   SUM(unique_sessions) AS unique_sessions,
                   MAX(last_seen) AS last_seen
            FROM huachicol.rollup_layers
            WHERE dia BETWEEN :df AND :dt AND app = :app
            GROUP BY layer_id
            ORDER BY activations DESC, unique_sessions DESC
            LIMIT :limit
            """
        ),
        {**period.range_params, "limit": limit},
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
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT evento_id,
                   MAX(titulo) AS titulo,
                   SUM(opens) AS opens,
                   SUM(closes) AS closes,
                   SUM(fun_facts) AS fun_facts,
                   SUM(centers) AS centers,
                   SUM(shares) AS shares,
                   SUM(unique_sessions) AS unique_sessions,
                   MAX(last_seen) AS last_seen
            FROM huachicol.rollup_eventos
            WHERE dia BETWEEN :df AND :dt AND app = :app
            GROUP BY evento_id
            ORDER BY opens DESC, unique_sessions DESC
            LIMIT :limit
            """
        ),
        {**period.range_params, "limit": limit},
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
            fun_facts=r["fun_facts"] or 0,
            centers=r["centers"] or 0,
            shares=r["shares"] or 0,
            unique_sessions=r["unique_sessions"] or 0,
            last_seen=r["last_seen"],
        )
        for r in rows
    ]


@router.get("/themes", response_model=list[ThemeStatRow], response_model_by_alias=True)
async def top_themes(
    limit: int = Query(default=50, ge=1, le=200),
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT theme_id,
                   SUM(views) AS views,
                   SUM(unique_sessions) AS unique_sessions,
                   MAX(last_seen) AS last_seen
            FROM huachicol.rollup_themes
            WHERE dia BETWEEN :df AND :dt AND app = :app
            GROUP BY theme_id
            ORDER BY views DESC, unique_sessions DESC
            LIMIT :limit
            """
        ),
        {**period.range_params, "limit": limit},
    ).mappings().all()

    theme_ids = [r["theme_id"] for r in rows]
    labels = await _fetch_layer_labels(theme_ids)

    return [
        ThemeStatRow(
            theme_id=r["theme_id"],
            views=r["views"] or 0,
            unique_sessions=r["unique_sessions"] or 0,
            last_seen=r["last_seen"],
            label=(labels.get(r["theme_id"]) or {}).get("label"),
            workspace=(labels.get(r["theme_id"]) or {}).get("workspace"),
        )
        for r in rows
        if (labels.get(r["theme_id"]) or {}).get("label")
        and (labels.get(r["theme_id"]) or {}).get("parent_id") != "eventos-auto"
        and (labels.get(r["theme_id"]) or {}).get("nodeType") == "tema"
    ]


@router.get("/buttons", response_model=list[ButtonStatRow], response_model_by_alias=True)
async def buttons(
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT event_name,
                   SUM(clicks) AS clicks,
                   SUM(unique_sessions) AS unique_sessions
            FROM huachicol.rollup_buttons
            WHERE dia BETWEEN :df AND :dt AND app = :app
            GROUP BY event_name
            ORDER BY clicks DESC
            """
        ),
        period.range_params,
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
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT event_name,
                   tool,
                   SUM(uses) AS uses,
                   SUM(unique_sessions) AS unique_sessions
            FROM huachicol.rollup_tools
            WHERE dia BETWEEN :df AND :dt AND app = :app
            GROUP BY event_name, tool
            ORDER BY uses DESC
            """
        ),
        period.range_params,
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
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    bucket = period.bucket_sql
    rows = db.execute(
        text(
            f"""
            SELECT {bucket} AS dia, source,
                   SUM(sessions) AS sessions,
                   SUM(events) AS events,
                   SUM(swipe) AS sessions_swipe,
                   SUM(drawing) AS sessions_drawing,
                   SUM(measurement) AS sessions_measurement,
                   SUM(downloaded) AS sessions_downloaded,
                   SUM(shared) AS sessions_shared,
                   SUM(reported) AS sessions_reported,
                   CASE WHEN SUM(sessions) > 0
                        THEN (SUM(dur_sum) / SUM(sessions))::int ELSE 0 END AS avg_duration_sec
            FROM huachicol.rollup_daily
            WHERE dia BETWEEN :df AND :dt AND app = :app
            GROUP BY {bucket}, source
            ORDER BY {bucket} ASC, source ASC
            """
        ),
        period.range_params,
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
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    where = "WHERE started_at >= :df AND started_at < :dt_excl AND app = :app"
    params: dict = {
        "limit": page_size,
        "offset": (page - 1) * page_size,
        "df": period.df,
        "dt_excl": period.dt + timedelta(days=1),
        "app": period.app,
    }
    if source != "all":
        where += " AND source = :source"
        params["source"] = source

    count_params = {k: v for k, v in params.items() if k not in {"limit", "offset"}}
    total = db.execute(
        text(f"SELECT COUNT(*) FROM huachicol.sessions {where}"),
        count_params,
    ).scalar() or 0

    rows = db.execute(
        text(
            f"""
            SELECT session_id, started_at, last_seen_at, source, events_count,
                   duration_sec, layers_activated, used_swipe, used_drawing,
                   downloaded, shared, reported, ua_family, referrer
            FROM huachicol.sessions
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
    app: str = Query(default="mapalab"),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    overview_row = db.execute(
        text(
            """
            SELECT COALESCE(SUM(sessions), 0) AS sessions_30d,
                   CASE WHEN SUM(sessions) > 0
                        THEN (SUM(dur_sum) / SUM(sessions))::int ELSE 0 END AS avg_duration_sec
            FROM huachicol.rollup_daily
            WHERE dia >= CURRENT_DATE - 29 AND app = :app
            """
        ),
        {"app": app},
    ).mappings().first()
    top_layer_row = db.execute(
        text(
            """
            SELECT layer_id, SUM(activations) AS activations
            FROM huachicol.rollup_layers
            WHERE dia >= CURRENT_DATE - 29 AND app = :app
            GROUP BY layer_id
            ORDER BY activations DESC, SUM(unique_sessions) DESC
            LIMIT 1
            """
        ),
        {"app": app},
    ).mappings().first()
    top_tool_row = db.execute(
        text(
            """
            SELECT tool, SUM(uses) AS uses
            FROM huachicol.rollup_tools
            WHERE dia >= CURRENT_DATE - 29 AND app = :app
            GROUP BY tool
            ORDER BY uses DESC
            LIMIT 1
            """
        ),
        {"app": app},
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
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    row = db.execute(
        text(
            """
            SELECT
                COALESCE(SUM(calls), 0) AS calls,
                COALESCE(SUM(tool_calls), 0) AS tool_calls,
                COALESCE(SUM(errors), 0) AS errors,
                COALESCE(SUM(unique_sessions), 0) AS sessions,
                CASE WHEN SUM(tool_dur_count) > 0
                     THEN (SUM(tool_dur_sum) / SUM(tool_dur_count))::int ELSE 0 END AS avg_tool_duration_ms
            FROM huachicol.mcp_rollup_daily
            WHERE dia BETWEEN :df AND :dt AND app = :app
            """
        ),
        period.range_params,
    ).mappings().first()
    clients = db.execute(
        text(
            """
            SELECT COUNT(DISTINCT client_name) AS clients
            FROM huachicol.mcp_rollup_clients
            WHERE dia BETWEEN :df AND :dt AND app = :app AND client_name <> 'unknown'
            """
        ),
        period.range_params,
    ).scalar() or 0
    if row is None:
        return McpStatsOverview(clients=clients)
    return McpStatsOverview(
        calls=row["calls"] or 0,
        tool_calls=row["tool_calls"] or 0,
        errors=row["errors"] or 0,
        sessions=row["sessions"] or 0,
        clients=clients,
        avg_tool_duration_ms=row["avg_tool_duration_ms"] or 0,
    )


@router.get("/mcp/tools", response_model=list[McpToolStatRow], response_model_by_alias=True)
async def mcp_tools(
    limit: int = Query(default=30, ge=1, le=100),
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT tool,
                   SUM(uses) AS uses,
                   SUM(errors) AS errors,
                   SUM(unique_sessions) AS unique_sessions,
                   CASE WHEN SUM(dur_count) > 0
                        THEN (SUM(dur_sum) / SUM(dur_count))::int ELSE 0 END AS avg_duration_ms,
                   MAX(last_seen) AS last_seen
            FROM huachicol.mcp_rollup_tools
            WHERE dia BETWEEN :df AND :dt AND app = :app
            GROUP BY tool
            ORDER BY uses DESC, last_seen DESC
            LIMIT :limit
            """
        ),
        {**period.range_params, "limit": limit},
    ).mappings().all()
    return [
        McpToolStatRow(
            tool=r["tool"],
            uses=r["uses"] or 0,
            errors=r["errors"] or 0,
            unique_sessions=r["unique_sessions"] or 0,
            avg_duration_ms=r["avg_duration_ms"] or 0,
            last_seen=r["last_seen"],
        )
        for r in rows
    ]


@router.get("/mcp/daily", response_model=list[McpDailyStatRow], response_model_by_alias=True)
async def mcp_daily(
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    bucket = period.bucket_sql
    rows = db.execute(
        text(
            f"""
            SELECT {bucket} AS dia,
                   SUM(calls) AS calls,
                   SUM(tool_calls) AS tool_calls,
                   SUM(errors) AS errors,
                   SUM(unique_sessions) AS unique_sessions,
                   CASE WHEN SUM(dur_count) > 0
                        THEN (SUM(dur_sum) / SUM(dur_count))::int ELSE 0 END AS avg_duration_ms
            FROM huachicol.mcp_rollup_daily
            WHERE dia BETWEEN :df AND :dt AND app = :app
            GROUP BY {bucket}
            ORDER BY {bucket} ASC
            """
        ),
        period.range_params,
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
    period: Period = Depends(get_period),
    db: Session = Depends(get_db),
    _current: Usuario = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT client_name,
                   client_version,
                   SUM(calls) AS calls,
                   SUM(unique_sessions) AS unique_sessions,
                   MAX(last_seen) AS last_seen
            FROM huachicol.mcp_rollup_clients
            WHERE dia BETWEEN :df AND :dt AND app = :app
            GROUP BY client_name, client_version
            ORDER BY calls DESC, last_seen DESC
            """
        ),
        period.range_params,
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
            detail="Solo administradoras pueden refrescar las estadísticas",
        )
    refreshed = rollup_stats(db)
    return {"ok": True, "refreshed": refreshed, "ts": datetime.utcnow().isoformat()}
