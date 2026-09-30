from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas._camel import CamelCaseInput
from app.schemas.mapalab_event import MAX_BATCH_EVENTS

INTRANET_EVENT_NAMES = frozenset(
    {
        "session_start",
        "session_heartbeat",
        "page_view",
        "ver_todo",
        "documento_ver",
        "documento_descargar",
        "galeria_abrir",
        "directorio_buscar",
        "herramienta_abrir",
        "proyecto_abrir",
        "roadmap_anio",
        "chino_abrir",
        "chino_pregunta",
        "aviso_propuesto",
        "ayuda_abrir",
        "sesion_entrar",
    }
)


class IntranetEventIn(CamelCaseInput):
    event_name: str = Field(..., max_length=50)
    ts: datetime | None = None
    layer_id: str | None = Field(default=None, max_length=120)
    props: dict[str, Any] = Field(default_factory=dict)

    @field_validator("event_name")
    @classmethod
    def _validate_name(cls, v: str) -> str:
        if v not in INTRANET_EVENT_NAMES:
            raise ValueError(f"event_name no permitido: {v}")
        return v


class IntranetEventBatchIn(CamelCaseInput):
    session_id: UUID
    source: Literal["pagina"] = "pagina"
    referrer: str | None = Field(default=None, max_length=500)
    pathname: str | None = Field(default=None, max_length=200)
    events: list[IntranetEventIn] = Field(..., min_length=1, max_length=MAX_BATCH_EVENTS)
