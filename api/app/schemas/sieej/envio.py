from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

EnvioEstado = Literal["en_proceso", "enviado", "expirado"]
EventoTipo = Literal["iniciado", "guardado", "enviado", "expirado", "reabierto"]


class EnvioArchivoResponse(BaseModel):
    id: int
    field_path: str
    bucket: str
    object_key: str
    url_publica: str | None
    filename_original: str
    mime: str
    size_bytes: int
    subido_en: datetime

    model_config = ConfigDict(from_attributes=True)


class EnvioResponse(BaseModel):
    id: int
    formulario_id: int
    formulario_version: int
    usuario_id: int | None
    estado: EnvioEstado
    datos: dict[str, Any]
    paso_actual: int
    iniciado_en: datetime
    enviado_en: datetime | None
    expirado_en: datetime | None
    actualizado_en: datetime
    archivos: list[EnvioArchivoResponse] = []

    model_config = ConfigDict(from_attributes=True)


class EnvioUpdate(BaseModel):
    """Body de PUT /formularios/:slug/envio.

    `enviar=True` cierra el envio (estado='enviado'); de lo contrario
    se guarda como borrador (estado='en_proceso').
    """

    datos: dict[str, Any] = Field(default_factory=dict)
    paso_actual: int = Field(default=0, ge=0)
    enviar: bool = False


class EnvioUploadResponse(BaseModel):
    field_path: str
    url_publica: str
    filename_original: str
    mime: str
    size_bytes: int


class EnvioEventoResponse(BaseModel):
    id: int
    envio_id: int
    tipo: EventoTipo
    payload: dict[str, Any] | None
    actor_usuario_id: int | None
    ocurrido_en: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Endpoints respondent: "Mis envios"
#
# El respondent ve solo sus envios. No exponemos actor_usuario_id en eventos
# para no filtrar identidad de admins que puedan reabrir/expirar.
# ---------------------------------------------------------------------------


class MisEnviosFormularioInfo(BaseModel):
    """Info ligera del formulario padre, usada en lista y detalle."""

    slug: str
    nombre: str
    descripcion: str | None = None

    model_config = ConfigDict(from_attributes=True)


class MisEnviosEventoResponse(BaseModel):
    """Evento del envio sin filtrar identidad del actor.

    El respondent solo necesita el tipo y el momento; quien lo dispara
    (el propio user, admin o sistema) se infiere del tipo desde el frontend.
    """

    tipo: EventoTipo
    ocurrido_en: datetime

    model_config = ConfigDict(from_attributes=True)


class MisEnviosListItem(BaseModel):
    """Item ligero de la lista de mis-envios. Sin definicion ni datos."""

    id: int
    formulario: MisEnviosFormularioInfo
    estado: EnvioEstado
    paso_actual: int
    iniciado_en: datetime
    enviado_en: datetime | None
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class MisEnviosListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[MisEnviosListItem]


class MisEnviosDetalle(BaseModel):
    """Detalle completo de un envio del propio respondent."""

    id: int
    formulario: MisEnviosFormularioInfo
    estado: EnvioEstado
    paso_actual: int
    datos: dict[str, Any]
    definicion_snapshot: dict[str, Any]
    archivos: list[EnvioArchivoResponse] = []
    eventos: list[MisEnviosEventoResponse] = []
    iniciado_en: datetime
    enviado_en: datetime | None
    expirado_en: datetime | None
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)
