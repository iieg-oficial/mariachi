from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import ConfigDict, Field, ValidationInfo, field_validator

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

    @field_validator(
        "method",
        "tool",
        "status",
        "session_hash",
        "ip_hash",
        "client_name",
        "client_version",
        mode="before",
    )
    @classmethod
    def _truncar_al_maximo(cls, value: Any, info: ValidationInfo) -> Any:
        if not isinstance(value, str):
            return value
        maximo = next(
            (m.max_length for m in cls.model_fields[info.field_name].metadata if hasattr(m, "max_length")),
            None,
        )
        return value[:maximo] if maximo else value


class MapalabMcpEventBatch(CamelCaseInput):
    items: list[MapalabMcpEventItem] = Field(default_factory=list)


class McpStatsOverview(CamelCaseOutput):
    calls: int = 0
    tool_calls: int = 0
    errors: int = 0
    sessions: int = 0
    clients: int = 0
    avg_tool_duration_ms: int = 0


class McpToolStatRow(CamelCaseOutput):
    tool: str
    uses: int = 0
    errors: int = 0
    unique_sessions: int = 0
    avg_duration_ms: int = 0
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
