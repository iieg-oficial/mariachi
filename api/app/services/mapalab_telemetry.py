from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import date, datetime, timezone

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.mapalab_event import MapalabEvent, MapalabSession
from app.schemas.mapalab_event import MAX_PROPS_BYTES, EventBatchIn
from app.services.pii_scrubber import _compile_patterns, _scrub_walk

logger = logging.getLogger(__name__)

_UA_FAMILY_PATTERNS = [
    (re.compile(r"Edg/", re.I), "Edge"),
    (re.compile(r"OPR/|Opera", re.I), "Opera"),
    (re.compile(r"Firefox/", re.I), "Firefox"),
    (re.compile(r"Chrome/", re.I), "Chrome"),
    (re.compile(r"Safari/", re.I), "Safari"),
    (re.compile(r"Mobile|Android|iPhone|iPad", re.I), "Mobile"),
]

_EVENTS_USED_SWIPE = {"swipe_enter", "swipe_exit", "swipe_slot_change"}
_EVENTS_USED_DRAWING = {"drawing_tool_use"}
_EVENTS_USED_MEASUREMENT = {"measurement_tool_use"}
_EVENTS_DOWNLOADED = {"layer_download", "map_export"}
_EVENTS_SHARED = {"share_map"}
_EVENTS_REPORTED = {"report_submitted"}
_EVENTS_LAYER_ACTIVATED = {"layer_toggle"}


def hash_ip(ip: str | None) -> str | None:
    if not ip:
        return None
    salt = date.today().isoformat()
    return hashlib.sha256(f"{ip}|{salt}".encode("utf-8")).hexdigest()[:64]


def parse_ua_family(user_agent: str | None) -> str | None:
    if not user_agent:
        return None
    for pattern, family in _UA_FAMILY_PATTERNS:
        if pattern.search(user_agent):
            return family
    return "Other"


def _scrub_props(props: dict) -> dict:
    if not isinstance(props, dict):
        return {}
    patterns = _compile_patterns(None)
    scrubbed = _scrub_walk(props, patterns)
    try:
        if len(json.dumps(scrubbed)) > MAX_PROPS_BYTES:
            return {"_truncated": True}
    except (TypeError, ValueError):
        return {}
    return scrubbed


def _truncate_str(value: str | None, max_len: int) -> str | None:
    if value is None:
        return None
    return value[:max_len] if len(value) > max_len else value


def ingest_batch(
    db: Session,
    payload: EventBatchIn,
    *,
    user_agent: str | None,
    api_key_id: int | None = None,
) -> int:
    ua_family_value = parse_ua_family(user_agent)
    referrer = _truncate_str(payload.referrer, 500)
    pathname = _truncate_str(payload.pathname, 200)

    rows: list[dict] = []
    used_swipe = False
    used_drawing = False
    used_measurement = False
    downloaded = False
    shared = False
    reported = False
    layers_activated_inc = 0

    for evt in payload.events:
        name = evt.event_name
        scrubbed = _scrub_props(evt.props or {})
        layer_id = _truncate_str(evt.layer_id, 120)
        ts_value: datetime = evt.ts or utcnow()
        if ts_value.tzinfo is None:
            ts_value = ts_value.replace(tzinfo=timezone.utc)

        rows.append({
            "ts": ts_value,
            "event_name": name[:50],
            "session_id": payload.session_id,
            "source": payload.source,
            "api_key_id": api_key_id,
            "layer_id": layer_id,
            "props": scrubbed,
            "ua_family": ua_family_value,
            "referrer": referrer,
            "pathname": pathname,
        })

        if name in _EVENTS_USED_SWIPE:
            used_swipe = True
        if name in _EVENTS_USED_DRAWING:
            used_drawing = True
        if name in _EVENTS_USED_MEASUREMENT:
            used_measurement = True
        if name in _EVENTS_DOWNLOADED:
            downloaded = True
        if name in _EVENTS_SHARED:
            shared = True
        if name in _EVENTS_REPORTED:
            reported = True
        if (
            name in _EVENTS_LAYER_ACTIVATED
            and (evt.props or {}).get("action") == "activar"
            and (evt.props or {}).get("source") != "evento_open"
        ):
            layers_activated_inc += 1

    if not rows:
        return 0

    db.bulk_insert_mappings(MapalabEvent, rows)

    last_ts = max(r["ts"] for r in rows)
    duration_sec = 0
    for evt in payload.events:
        if evt.event_name == "session_heartbeat":
            try:
                inc = int((evt.props or {}).get("durationSec") or 0)
                if 0 < inc < 86400:
                    duration_sec = max(duration_sec, inc)
            except (TypeError, ValueError):
                continue

    stmt = pg_insert(MapalabSession).values(
        session_id=payload.session_id,
        started_at=rows[0]["ts"],
        last_seen_at=last_ts,
        source=payload.source,
        api_key_id=api_key_id,
        events_count=len(rows),
        duration_sec=duration_sec,
        layers_activated=layers_activated_inc,
        used_swipe=used_swipe,
        used_drawing=used_drawing,
        used_measurement=used_measurement,
        downloaded=downloaded,
        shared=shared,
        reported=reported,
        ua_family=ua_family_value,
        referrer=referrer,
        entry_pathname=pathname,
    )
    update_dict = {
        "last_seen_at": last_ts,
        "events_count": MapalabSession.events_count + len(rows),
        "layers_activated": MapalabSession.layers_activated + layers_activated_inc,
        "used_swipe": MapalabSession.used_swipe.op("OR")(used_swipe),
        "used_drawing": MapalabSession.used_drawing.op("OR")(used_drawing),
        "used_measurement": MapalabSession.used_measurement.op("OR")(used_measurement),
        "downloaded": MapalabSession.downloaded.op("OR")(downloaded),
        "shared": MapalabSession.shared.op("OR")(shared),
        "reported": MapalabSession.reported.op("OR")(reported),
    }
    if duration_sec:
        update_dict["duration_sec"] = duration_sec
    stmt = stmt.on_conflict_do_update(
        index_elements=["session_id"],
        set_=update_dict,
    )
    db.execute(stmt)
    db.commit()
    return len(rows)


_VISOR_BUTTON_NAMES = (
    "'sider_lock','logo_click','contribute_click','share_map','info_open',"
    "'report_submitted','layer_download','opacity_change','legends_toggle',"
    "'infobox_action','home_action','layer_reorder','basemap_change',"
    "'geolocate','map_export','periodicity_advanced',"
    "'evento_fun_fact','evento_center','evento_share'"
)

# (nombre, tabla rollup, columna fecha del crudo, INSERT ... SELECT sin WHERE de fecha)
# El servicio agrega el filtro `>= CURRENT_DATE - :days` y un DELETE de la misma
# ventana para que cada corrida sea idempotente y capture eventos tardíos.
_ROLLUP_STEPS: tuple[tuple[str, str, str], ...] = (
    (
        "huachicol.rollup_daily",
        """
        INSERT INTO huachicol.rollup_daily
            (dia, app, source, sessions, events, dur_sum, swipe, drawing, measurement,
             downloaded, shared, reported)
        SELECT
            DATE(started_at), app, source,
            COUNT(*), COALESCE(SUM(events_count), 0), COALESCE(SUM(duration_sec), 0),
            SUM(CASE WHEN used_swipe THEN 1 ELSE 0 END),
            SUM(CASE WHEN used_drawing THEN 1 ELSE 0 END),
            SUM(CASE WHEN used_measurement THEN 1 ELSE 0 END),
            SUM(CASE WHEN downloaded THEN 1 ELSE 0 END),
            SUM(CASE WHEN shared THEN 1 ELSE 0 END),
            SUM(CASE WHEN reported THEN 1 ELSE 0 END)
        FROM huachicol.sessions
        WHERE started_at >= CURRENT_DATE - :days
        GROUP BY DATE(started_at), app, source
        """,
        "started_at",
    ),
    (
        "huachicol.rollup_layers",
        """
        INSERT INTO huachicol.rollup_layers
            (dia, app, layer_id, activations, downloads, feature_clicks, detail_opens,
             opacity_changes, unique_sessions, last_seen)
        SELECT
            DATE(ts), app, layer_id,
            COUNT(*) FILTER (
                WHERE event_name = 'layer_toggle'
                  AND (props->>'action') = 'activar'
                  AND (props->>'source') IS DISTINCT FROM 'evento_open'),
            COUNT(*) FILTER (WHERE event_name = 'layer_download'),
            COUNT(*) FILTER (WHERE event_name = 'feature_click'),
            COUNT(*) FILTER (WHERE event_name = 'layer_detail_open'),
            COUNT(*) FILTER (WHERE event_name = 'opacity_change'),
            COUNT(DISTINCT session_id), MAX(ts)
        FROM huachicol.events
        WHERE layer_id IS NOT NULL AND ts >= CURRENT_DATE - :days
        GROUP BY DATE(ts), app, layer_id
        """,
        "ts",
    ),
    (
        "huachicol.rollup_buttons",
        f"""
        INSERT INTO huachicol.rollup_buttons (dia, app, event_name, clicks, unique_sessions)
        SELECT DATE(ts), app, event_name, COUNT(*), COUNT(DISTINCT session_id)
        FROM huachicol.events
        WHERE event_name IN ({_VISOR_BUTTON_NAMES}) AND ts >= CURRENT_DATE - :days
        GROUP BY DATE(ts), app, event_name
        """,
        "ts",
    ),
    (
        "huachicol.rollup_tools",
        """
        INSERT INTO huachicol.rollup_tools (dia, app, event_name, tool, uses, unique_sessions)
        SELECT DATE(ts), app, event_name, COALESCE(props->>'tool', 'unknown'),
               COUNT(*), COUNT(DISTINCT session_id)
        FROM huachicol.events
        WHERE event_name IN ('drawing_tool_use', 'measurement_tool_use')
          AND ts >= CURRENT_DATE - :days
        GROUP BY DATE(ts), app, event_name, COALESCE(props->>'tool', 'unknown')
        """,
        "ts",
    ),
    (
        "huachicol.rollup_eventos",
        """
        INSERT INTO huachicol.rollup_eventos
            (dia, app, evento_id, titulo, opens, closes, fun_facts, centers, shares,
             unique_sessions, last_seen)
        SELECT
            DATE(ts), app, (props->>'evento_id'), MAX(props->>'titulo'),
            COUNT(*) FILTER (WHERE event_name = 'evento_open'),
            COUNT(*) FILTER (WHERE event_name = 'evento_close'),
            COUNT(*) FILTER (WHERE event_name = 'evento_fun_fact'),
            COUNT(*) FILTER (WHERE event_name = 'evento_center'),
            COUNT(*) FILTER (WHERE event_name = 'evento_share'),
            COUNT(DISTINCT session_id), MAX(ts)
        FROM huachicol.events
        WHERE event_name IN (
            'evento_open', 'evento_close',
            'evento_fun_fact', 'evento_center', 'evento_share'
        )
          AND (props->>'evento_id') IS NOT NULL AND ts >= CURRENT_DATE - :days
        GROUP BY DATE(ts), app, (props->>'evento_id')
        """,
        "ts",
    ),
    (
        "huachicol.mcp_rollup_daily",
        """
        INSERT INTO huachicol.mcp_rollup_daily
            (dia, app, calls, tool_calls, errors, unique_sessions, dur_sum, dur_count,
             tool_dur_sum, tool_dur_count)
        SELECT
            dia, app, COUNT(*),
            COUNT(*) FILTER (WHERE method = 'tools/call'),
            COUNT(*) FILTER (WHERE status = 'error'),
            COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL),
            COALESCE(SUM(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 0),
            COUNT(*) FILTER (WHERE duration_ms IS NOT NULL),
            COALESCE(SUM(duration_ms) FILTER (WHERE method = 'tools/call' AND duration_ms IS NOT NULL), 0),
            COUNT(*) FILTER (WHERE method = 'tools/call' AND duration_ms IS NOT NULL)
        FROM huachicol.mcp_events
        WHERE dia >= CURRENT_DATE - :days
        GROUP BY dia, app
        """,
        "dia",
    ),
    (
        "huachicol.mcp_rollup_tools",
        """
        INSERT INTO huachicol.mcp_rollup_tools
            (dia, app, tool, uses, errors, unique_sessions, dur_sum, dur_count, last_seen)
        SELECT
            dia, app, tool, COUNT(*),
            COUNT(*) FILTER (WHERE status = 'error'),
            COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL),
            COALESCE(SUM(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 0),
            COUNT(*) FILTER (WHERE duration_ms IS NOT NULL),
            MAX(timestamp)
        FROM huachicol.mcp_events
        WHERE tool IS NOT NULL AND dia >= CURRENT_DATE - :days
        GROUP BY dia, app, tool
        """,
        "dia",
    ),
    (
        "huachicol.mcp_rollup_clients",
        """
        INSERT INTO huachicol.mcp_rollup_clients
            (dia, app, client_name, client_version, calls, unique_sessions, last_seen)
        SELECT
            dia, app, COALESCE(client_name, 'unknown'), COALESCE(client_version, ''),
            COUNT(*),
            COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL),
            MAX(timestamp)
        FROM huachicol.mcp_events
        WHERE dia >= CURRENT_DATE - :days
        GROUP BY dia, app, COALESCE(client_name, 'unknown'), COALESCE(client_version, '')
        """,
        "dia",
    ),
    (
        "huachicol.rollup_themes",
        """
        INSERT INTO huachicol.rollup_themes
            (dia, app, theme_id, views, unique_sessions, last_seen)
        SELECT
            DATE(ts), app, props->>'theme',
            COUNT(*), COUNT(DISTINCT session_id), MAX(ts)
        FROM huachicol.events
        WHERE event_name = 'theme_change'
          AND props->>'theme' IS NOT NULL AND ts >= CURRENT_DATE - :days
        GROUP BY DATE(ts), app, props->>'theme'
        """,
        "ts",
    ),
)


def rollup_stats(db: Session, *, since_days: int = 3) -> list[str]:
    """Recomputa los rollups diarios de los últimos `since_days` días desde los
    crudos y hace upsert idempotente (DELETE + INSERT de la ventana). Captura
    eventos tardíos y el día en curso; las filas históricas fuera de la ventana
    persisten indefinidamente (no se purgan). Reemplaza al refresh de matviews.
    """
    refreshed: list[str] = []
    for name, insert_sql, _date_col in _ROLLUP_STEPS:
        try:
            db.execute(
                text(f"DELETE FROM {name} WHERE dia >= CURRENT_DATE - :days"),
                {"days": since_days},
            )
            db.execute(text(insert_sql), {"days": since_days})
            db.commit()
            refreshed.append(name)
        except Exception:
            logger.exception("mapalab_telemetry.rollup_failed step=%s", name)
            db.rollback()
    return refreshed
