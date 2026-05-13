from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas._camel import CamelCaseInput

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
    source: Literal["visor", "embed", "widget"] = "visor"
    referrer: str | None = Field(default=None, max_length=500)
    pathname: str | None = Field(default=None, max_length=200)
    events: list[EventIn] = Field(..., min_length=1, max_length=MAX_BATCH_EVENTS)


class EventBatchResponse(BaseModel):
    ok: bool
    inserted: int


class StatsOverview(BaseModel):
    sessions30d: int
    sessions7d: int
    sessions1d: int
    events30d: int
    avgDurationSec: int
    swipeSessions30d: int
    drawingSessions30d: int
    downloadSessions30d: int
    shareSessions30d: int


class LayerStatRow(BaseModel):
    layerId: str
    activations: int
    downloads: int
    featureClicks: int
    detailOpens: int
    opacityChanges: int
    uniqueSessions: int
    lastSeen: datetime | None = None
    label: str | None = None
    workspace: str | None = None


class ButtonStatRow(BaseModel):
    eventName: str
    clicks: int
    uniqueSessions: int


class ToolStatRow(BaseModel):
    eventName: str
    tool: str
    uses: int
    uniqueSessions: int


class DailyStatRow(BaseModel):
    dia: str
    source: str
    sessions: int
    events: int
    sessionsSwipe: int
    sessionsDrawing: int
    sessionsMeasurement: int
    sessionsDownloaded: int
    sessionsShared: int
    sessionsReported: int
    avgDurationSec: int


class SessionRow(BaseModel):
    sessionId: str
    startedAt: datetime
    lastSeenAt: datetime
    source: str
    eventsCount: int
    durationSec: int
    layersActivated: int
    usedSwipe: bool
    usedDrawing: bool
    downloaded: bool
    shared: bool
    reported: bool
    uaFamily: str | None = None
    referrer: str | None = None


class SessionsPage(BaseModel):
    items: list[SessionRow]
    total: int
    page: int
    pageSize: int


class HighlightLayer(BaseModel):
    layerId: str
    label: str | None = None
    activations: int


class HighlightTool(BaseModel):
    tool: str
    uses: int


class StatsHighlights(BaseModel):
    sessions30d: int
    avgDurationSec: int
    topLayer: HighlightLayer | None = None
    topTool: HighlightTool | None = None
