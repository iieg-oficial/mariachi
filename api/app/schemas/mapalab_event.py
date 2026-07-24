from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas._camel import CamelCaseInput, CamelCaseOutput

ALLOWED_EVENT_NAMES = frozenset({
    "session_start",
    "session_heartbeat",
    "layer_toggle",
    "layer_detail_open",
    "layer_download",
    "layer_reorder",
    "feature_click",
    "map_zoom_level",
    "map_export",
    "map_interaction",
    "basemap_change",
    "geolocate",
    "raster_loop_start",
    "raster_loop_stop",
    "drawing_tool_use",
    "measurement_tool_use",
    "periodicity_advanced",
    "layer_search",
    "sider_lock",
    "share_map",
    "info_open",
    "report_submitted",
    "evento_open",
    "evento_close",
    "evento_center",
    "evento_share",
    "theme_change",
    "opacity_change",
    "legends_toggle",
    "swipe_enter",
    "swipe_exit",
    "swipe_slot_change",
    "infobox_action",
    "home_action",
    "contribute_click",
    "logo_click",
    "embed_view",
    "tools_panel_open",
    "layer_notice_view",
    "layer_notice_dismiss",
    "layer_notice_cta_click",
    "municipio_mode_enter",
    "municipio_mode_exit",
    "municipio_mode_change",
    "municipio_panel_open",
    "evento_fun_fact",
    "catalogo_open",
    "catalogo_back",
    "catalogo_search",
    "catalogo_layer_select",
    "catalogo_layer_close",
    "catalogo_feature_click",
    "catalogo_info_open",
    "catalogo_download",
    "catalogo_tools_toggle",
    "catalogo_slug_not_found",
    "catalogo_share",
    "catalogo_institucion_select",
})

MAX_BATCH_EVENTS = 100
MAX_PROPS_BYTES = 4096


class EventIn(CamelCaseInput):
    event_name: str = Field(..., max_length=50)
    ts: datetime | None = None
    layer_id: str | None = Field(default=None, max_length=120)
    props: dict[str, Any] = Field(default_factory=dict)

    @field_validator("event_name")
    @classmethod
    def _validate_name(cls, v: str) -> str:
        if v not in ALLOWED_EVENT_NAMES:
            raise ValueError(f"event_name no permitido: {v}")
        return v

    @field_validator("props")
    @classmethod
    def _validate_props(cls, v: dict) -> dict:
        if not isinstance(v, dict):
            raise ValueError("props debe ser un objeto")
        return v


class EventBatchIn(CamelCaseInput):
    session_id: UUID
    source: Literal["visor", "embed", "widget", "catalogo"] = "visor"
    referrer: str | None = Field(default=None, max_length=500)
    pathname: str | None = Field(default=None, max_length=200)
    events: list[EventIn] = Field(..., min_length=1, max_length=MAX_BATCH_EVENTS)


class EventBatchResponse(BaseModel):
    ok: bool
    inserted: int


class StatsOverview(CamelCaseOutput):
    sessions: int
    events: int
    avg_duration_sec: int
    swipe_sessions: int
    drawing_sessions: int
    download_sessions: int
    share_sessions: int
    reported_sessions: int


class LayerStatRow(CamelCaseOutput):
    layer_id: str
    activations: int
    downloads: int
    feature_clicks: int
    detail_opens: int
    opacity_changes: int
    unique_sessions: int
    last_seen: datetime | None = None
    label: str | None = None
    workspace: str | None = None


class EventoStatRow(CamelCaseOutput):
    evento_id: str
    titulo: str | None = None
    opens: int
    closes: int
    fun_facts: int
    centers: int
    shares: int
    unique_sessions: int
    last_seen: datetime | None = None


class ButtonStatRow(CamelCaseOutput):
    event_name: str
    clicks: int
    unique_sessions: int


class ToolStatRow(CamelCaseOutput):
    event_name: str
    tool: str
    uses: int
    unique_sessions: int


class DailyStatRow(CamelCaseOutput):
    dia: str
    source: str
    sessions: int
    events: int
    sessions_swipe: int
    sessions_drawing: int
    sessions_measurement: int
    sessions_downloaded: int
    sessions_shared: int
    sessions_reported: int
    avg_duration_sec: int


class SessionRow(CamelCaseOutput):
    session_id: str
    started_at: datetime
    last_seen_at: datetime
    source: str
    events_count: int
    duration_sec: int
    layers_activated: int
    used_swipe: bool
    used_drawing: bool
    downloaded: bool
    shared: bool
    reported: bool
    ua_family: str | None = None
    referrer: str | None = None


class SessionsPage(CamelCaseOutput):
    items: list[SessionRow]
    total: int
    page: int
    page_size: int


class HighlightLayer(CamelCaseOutput):
    layer_id: str
    label: str | None = None
    activations: int


class HighlightTool(CamelCaseOutput):
    tool: str
    uses: int


class StatsHighlights(CamelCaseOutput):
    sessions_30d: int
    avg_duration_sec: int
    top_layer: HighlightLayer | None = None
    top_tool: HighlightTool | None = None


class ThemeStatRow(CamelCaseOutput):
    theme_id: str
    label: str | None = None
    workspace: str | None = None
    views: int
    unique_sessions: int
    last_seen: datetime | None = None
