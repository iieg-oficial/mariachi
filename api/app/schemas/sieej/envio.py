from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.sieej.compat import normalizar_definicion

EnvioEstado = Literal["en_proceso", "enviado", "expirado"]
EventoTipo = Literal[
    "iniciado", "guardado", "enviado", "expirado", "reabierto", "actualizado"
]


class CambioRef(BaseModel):
    """Un cambio de definicion visible para el respondent (banner/distintivos)."""

    step_id: str
    field_name: str | None = None
    tipo: Literal["nuevo", "eliminado", "modificado"]
    step_title: str | None = None
    field_label: str | None = None


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
    usuario_nombre: str | None = None
    usuario_email: str | None = None
    estado: EnvioEstado
    datos: dict[str, Any]
    paso_actual: int
    iniciado_en: datetime
    enviado_en: datetime | None
    expirado_en: datetime | None
    actualizado_en: datetime
    archivos: list[EnvioArchivoResponse] = []
    actualizacion_disponible: bool = False
    cambios_preview: list[CambioRef] = []
    cambios_aplicados: list[CambioRef] = []

    model_config = ConfigDict(from_attributes=True)


class EnvioDetalleResponse(EnvioResponse):
    """Detalle de un envio para el admin, con el snapshot de la definicion
    con la que se lleno (para render legible y diff contra la version actual).
    """

    definicion_snapshot: dict[str, Any]

    @field_validator("definicion_snapshot", mode="before")
    @classmethod
    def _compat_snapshot(cls, value: Any) -> Any:
        return normalizar_definicion(value) if isinstance(value, dict) else value


class EnvioUpdate(BaseModel):
    """Body de PUT /formularios/:slug/envio.

    `enviar=True` cierra el envio (estado='enviado'); de lo contrario
    se guarda como borrador (estado='en_proceso').
    """

    datos: dict[str, Any] = Field(default_factory=dict)
    paso_actual: int = Field(default=0, ge=0)
    enviar: bool = False
    cambios_vistos: list[str] = Field(default_factory=list)


class EnvioActualizarCampos(BaseModel):
    """Body de PUT /formularios/mis-envios/:id/actualizar-campos.

    `campos` mapea `field_path` (`step_id.field_name`) al valor nuevo. Solo se
    aceptan campos marcados `editableAfterSubmit` en el snapshot del envio; el
    backend rechaza (422) cualquier otro path.
    """

    campos: dict[str, Any] = Field(default_factory=dict)


class EnvioCapturaCampos(BaseModel):
    """Body de PATCH /formularios/:slug/envio/campos.

    `campos` mapea `field_path` al valor nuevo; a diferencia de la correccion
    post-envio acepta cualquier campo capturable, porque el envio sigue
    `en_proceso`. `desde` es la `datos_version` que el cliente ya tiene: sirve
    para devolverle solo el delta y para detectar que otro miembro toco alguno
    de los mismos campos mientras tanto.
    """

    campos: dict[str, Any] = Field(default_factory=dict)
    desde: int = 0


class EnvioCampoCambio(BaseModel):
    """Un campo que cambio de valor, con quien lo dejo asi."""

    field_path: str
    valor_nuevo: Any = None
    actor_nombre: str | None = None
    cambiado_en: datetime


class EnvioCapturaResponse(BaseModel):
    """Version nueva del envio mas lo que cambio desde `desde`.

    El delta incluye los campos que escribio quien llama: el cliente ya los
    tiene, pero traerlos completa la autoria sin una llamada extra.
    """

    datos_version: int
    estado: EnvioEstado
    cambios: list[EnvioCampoCambio] = Field(default_factory=list)


class EnvioHistorialItem(BaseModel):
    """Una entrada del historial de cambios de valor (vista respondent).

    No expone al actor (consistente con `MisEnviosEventoResponse`).
    """

    field_path: str
    field_label: str | None = None
    valor_anterior: Any = None
    valor_nuevo: Any = None
    formulario_version: int
    cambiado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class EnvioHistorialAdminItem(EnvioHistorialItem):
    """Entrada del historial para el admin, con identidad del actor."""

    envio_id: int
    actor_usuario_id: int | None = None
    actor_nombre: str | None = None
    actor_email: str | None = None


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
    """Info ligera del formulario padre, usada en el detalle."""

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

    @field_validator("definicion_snapshot", mode="before")
    @classmethod
    def _compat_snapshot(cls, value: Any) -> Any:
        return normalizar_definicion(value) if isinstance(value, dict) else value
