from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

FormularioEstado = Literal["borrador", "activo", "cerrado"]


class FormularioBase(BaseModel):
    slug: str = Field(min_length=1, max_length=128, pattern=r"^[a-z0-9][a-z0-9-_]*$")
    nombre: str = Field(min_length=1, max_length=255)
    descripcion: str | None = None
    definicion: dict[str, Any]
    vigencia_inicio: datetime | None = None
    vigencia_fin: datetime | None = None
    periodicidad: dict[str, Any] | None = None
    publico: bool = False


class FormularioCreate(FormularioBase):
    pass


class FormularioUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=255)
    descripcion: str | None = None
    definicion: dict[str, Any] | None = None
    vigencia_inicio: datetime | None = None
    vigencia_fin: datetime | None = None
    periodicidad: dict[str, Any] | None = None
    publico: bool | None = None


class GrupoRef(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class UsuarioRef(BaseModel):
    id: int
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class FormularioResponse(FormularioBase):
    id: int
    estado: FormularioEstado
    version: int
    creado_por_id: int
    creado_en: datetime
    actualizado_en: datetime
    grupos: list[GrupoRef] = []
    usuarios_asignados: list[UsuarioRef] = []

    model_config = ConfigDict(from_attributes=True)


class UltimoCambioInfo(BaseModel):
    """Resultado de clasificar el ultimo cambio de definicion."""

    tipo: Literal["menor", "rompe"]
    afectados: int
    reabiertos: int = 0


class FormularioUpdateResponse(FormularioResponse):
    """Respuesta del PUT admin: incluye la clasificacion del ultimo cambio
    para el feedback del editor (menor propagado vs estructural)."""

    ultimo_cambio: UltimoCambioInfo | None = None


class FormularioListItem(BaseModel):
    """Item de la lista de formularios visibles para el respondent."""

    id: int
    slug: str
    nombre: str
    descripcion: str | None
    estado: FormularioEstado
    vigencia_inicio: datetime | None
    vigencia_fin: datetime | None
    estado_envio: Literal["no_iniciado", "en_proceso", "enviado", "expirado"]
    envio_id: int | None
    actualizacion_disponible: bool = False
    # Apertura periodica: `periodico` marca el formulario con ventanas
    # recurrentes; cuando esta cerrado, `abierto=False` y `proxima_apertura`
    # indica cuando vuelve a abrir. En no periodicos `abierto` es siempre True.
    periodico: bool = False
    abierto: bool = True
    ventana_apertura: datetime | None = None
    ventana_cierre: datetime | None = None
    proxima_apertura: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class FormularioDetalle(BaseModel):
    """Definicion + estado del envio del usuario actual."""

    id: int
    slug: str
    nombre: str
    descripcion: str | None
    estado: FormularioEstado
    vigencia_inicio: datetime | None
    vigencia_fin: datetime | None
    version: int
    definicion: dict[str, Any]
    envio: "EnvioResponse | None" = None
    periodico: bool = False
    abierto: bool = True
    ventana_apertura: datetime | None = None
    ventana_cierre: datetime | None = None
    proxima_apertura: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


from app.schemas.sieej.envio import EnvioResponse  # noqa: E402

FormularioDetalle.model_rebuild()
