from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AutoCaptured(BaseModel):
    user_agent: str | None = Field(default=None, alias="userAgent")
    viewport: dict | None = None
    url: str | None = None
    referrer: str | None = None
    lang: str | None = None
    timezone: str | None = None
    timestamp: str | None = None
    version: str | None = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class IdentifyUser(BaseModel):
    id: int | str | None = None
    email: str | None = None
    name: str | None = None
    role: str | None = None
    metadata: dict | None = None

    model_config = ConfigDict(extra="allow")


class Breadcrumb(BaseModel):
    timestamp: str | None = None
    category: str | None = None
    level: Literal["debug", "info", "warning", "error", "critical"] | None = None
    message: str | None = None
    data: dict | None = None

    model_config = ConfigDict(extra="allow")


class SourceContext(BaseModel):
    """Estructura normalizada del source_context que envía el widget.

    Todo es opcional; los huéspedes legacy mandan dicts arbitrarios y el modelo
    los pasa por `extra="allow"` sin perder información.
    """

    auto: AutoCaptured | None = None
    user: IdentifyUser | None = None
    breadcrumbs: list[Breadcrumb] | None = None
    custom: dict | None = None

    model_config = ConfigDict(extra="allow")


def parse_source_context(raw: Any) -> dict:
    """Parsea un dict arbitrario contra el SourceContext schema. Si tiene
    estructura reconocible, la normaliza; si es un dict legacy plano, lo
    devuelve tal cual.
    """
    if not isinstance(raw, dict):
        return {}
    try:
        parsed = SourceContext.model_validate(raw)
        return parsed.model_dump(exclude_none=True, by_alias=True)
    except Exception:
        return raw
