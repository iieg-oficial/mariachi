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
