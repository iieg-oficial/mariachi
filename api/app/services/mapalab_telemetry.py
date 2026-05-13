from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import date, datetime, timezone
from typing import Iterable
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.mapalab_event import MapalabEvent, MapalabSession
from app.schemas.mapalab_event import MAX_PROPS_BYTES, EventBatchIn, EventIn
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
    ip: str | None,
    user_agent: str | None,
    api_key_id: int | None = None,
) -> int:
    ip_hash_value = hash_ip(ip)
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
            "ip_hash": ip_hash_value,
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
        if name in _EVENTS_LAYER_ACTIVATED and (evt.props or {}).get("action") == "activar":
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
        ip_hash=ip_hash_value,
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


REFRESH_VIEWS = (
    "mapalab_stats_overview",
    "mapalab_stats_layers",
    "mapalab_stats_buttons",
    "mapalab_stats_tools",
    "mapalab_stats_daily",
)


def refresh_stats_views(db: Session, *, concurrent: bool = True) -> list[str]:
    refreshed: list[str] = []
    for view in REFRESH_VIEWS:
        mode = "CONCURRENTLY" if concurrent and view != "mapalab_stats_overview" else ""
        stmt = f"REFRESH MATERIALIZED VIEW {mode} {view}".strip()
        try:
            db.execute(text(stmt))
            db.commit()
            refreshed.append(view)
        except Exception:
            logger.exception("mapalab_telemetry.refresh_failed view=%s", view)
            db.rollback()
            try:
                db.execute(text(f"REFRESH MATERIALIZED VIEW {view}"))
                db.commit()
                refreshed.append(view)
            except Exception:
                logger.exception("mapalab_telemetry.refresh_failed_fallback view=%s", view)
                db.rollback()
    return refreshed
