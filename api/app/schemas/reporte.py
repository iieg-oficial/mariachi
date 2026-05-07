from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas._camel import CamelCaseInput
from app.schemas.direccion_organizacional import DireccionOrganizacionalRef

ReporteTipo = Literal[
    "problema",
    "solicitud",
    "sugerencia",
    "duda",
    "datos_incorrectos",
    "bug",
]
ReporteEstado = Literal["nuevo", "en_revision", "resuelto", "descartado"]


class ReporteCreate(CamelCaseInput):
    tipo: ReporteTipo
    mensaje: str = Field(..., min_length=1, max_length=2000)
    email_contacto: EmailStr | None = None
    source_app: str = Field(..., min_length=1, max_length=50)
    source_route: str | None = Field(default=None, max_length=500)
    source_context: dict = Field(default_factory=dict)


ReporteSeveridad = Literal["baja", "media", "alta", "critica"]
ReportePrioridad = Literal["P0", "P1", "P2", "P3"]


class ReporteUpdate(CamelCaseInput):
    estado: ReporteEstado | None = None
    nota_interna: str | None = None
    atendido_por_id: int | None = Field(default=None, alias="atendidoPorId")
    direccion_id: int | None = Field(default=None, alias="direccionId")
    severidad: ReporteSeveridad | None = None
    prioridad: ReportePrioridad | None = None
    duplicado_de: int | None = Field(default=None, alias="duplicadoDe")
    bloqueado_por: str | None = Field(default=None, alias="bloqueadoPor")

    model_config = ConfigDict(populate_by_name=True)


class ReporteAdminResponse(BaseModel):
    id: int
    tipo: ReporteTipo
    mensaje: str
    email_contacto: str | None = Field(default=None, serialization_alias="emailContacto")
    source_app: str = Field(..., serialization_alias="sourceApp")
    source_route: str | None = Field(default=None, serialization_alias="sourceRoute")
    source_context: dict = Field(default_factory=dict, serialization_alias="sourceContext")
    screenshot_url: str | None = Field(default=None, serialization_alias="screenshotUrl")
    estado: ReporteEstado
    nota_interna: str | None = Field(default=None, serialization_alias="notaInterna")
    atendido_por_id: int | None = Field(default=None, serialization_alias="atendidoPorId")
    direccion_id: int | None = Field(default=None, serialization_alias="direccionId")
    direccion: DireccionOrganizacionalRef | None = None
    severidad: ReporteSeveridad | None = None
    prioridad: ReportePrioridad | None = None
    duplicado_de: int | None = Field(default=None, serialization_alias="duplicadoDe")
    bloqueado_por: str | None = Field(default=None, serialization_alias="bloqueadoPor")
    grupo_id: int | None = Field(default=None, serialization_alias="grupoId")
    respuestas: dict | None = None
    creado_en: datetime = Field(..., serialization_alias="creadoEn")
    actualizado_en: datetime = Field(..., serialization_alias="actualizadoEn")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ReporteListResponse(BaseModel):
    items: list[ReporteAdminResponse]
    total: int
    page: int
    size: int


class ReporteCreateResponse(BaseModel):
    id: int
