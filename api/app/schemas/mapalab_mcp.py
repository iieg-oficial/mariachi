from __future__ import annotations

from datetime import datetime

from pydantic import ConfigDict, Field

from app.schemas._camel import CamelCaseInput, CamelCaseOutput


class MapalabMcpEventItem(CamelCaseInput):
    timestamp: datetime
    method: str = Field(..., max_length=40)
    tool: str | None = Field(default=None, max_length=80)
    status: str = Field(..., max_length=20)
    error_code: int | None = None
    duration_ms: int | None = Field(default=None, ge=0)
    bytes_out: int | None = Field(default=None, ge=0)
    session_hash: str | None = Field(default=None, max_length=64)
    ip_hash: str | None = Field(default=None, max_length=64)
    client_name: str | None = Field(default=None, max_length=80)
    client_version: str | None = Field(default=None, max_length=40)

    model_config = ConfigDict(populate_by_name=True)


class MapalabMcpEventBatch(CamelCaseInput):
    items: list[MapalabMcpEventItem] = Field(default_factory=list)


class McpStatsOverview(CamelCaseOutput):
    calls_30d: int = 0
    calls_7d: int = 0
    calls_1d: int = 0
    errors_30d: int = 0
    sessions_30d: int = 0
    clients_30d: int = 0
    avg_tool_duration_ms: int = 0
    tool_calls_30d: int = 0


class McpToolStatRow(CamelCaseOutput):
    tool: str
    uses: int = 0
    errors: int = 0
    unique_sessions: int = 0
    avg_duration_ms: int = 0
    p95_duration_ms: int = 0
    last_seen: datetime | None = None


class McpDailyStatRow(CamelCaseOutput):
    dia: str
    calls: int = 0
    tool_calls: int = 0
    errors: int = 0
    unique_sessions: int = 0
    avg_duration_ms: int = 0


class McpClientStatRow(CamelCaseOutput):
    client_name: str
    client_version: str = ""
    calls: int = 0
    unique_sessions: int = 0
    last_seen: datetime | None = None
