from __future__ import annotations

from typing import Any

from pydantic import Field

from app.schemas._camel import CamelCaseInput, CamelCaseOutput


class GridCellChange(CamelCaseInput):
    row_key: str = Field(..., max_length=300)
    column: str = Field(..., max_length=100)
    from_value: Any = None
    to_value: Any = None


class GridCellsRequest(CamelCaseInput):
    changes: list[GridCellChange] = Field(default_factory=list)


class GridCellsResponse(CamelCaseOutput):
    applied: int = 0
    rows_touched: int = 0
    conflicts: list[dict] = Field(default_factory=list)
    rejected: list[dict] = Field(default_factory=list)


class GridRowsResponse(CamelCaseOutput):
    resource: str
    row_key_field: str
    columns: list[dict] = Field(default_factory=list)
    rows: list[dict] = Field(default_factory=list)


class GridPresenceEntry(CamelCaseOutput):
    username: str
    name: str | None = None
    row_key: str | None = None
