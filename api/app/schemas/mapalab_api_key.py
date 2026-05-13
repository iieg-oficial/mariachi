from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas._camel import CamelCaseInput


Visibility = Literal["public", "private"]
Estado = Literal["active", "suspended", "revoked"]


class MapalabApiKeyBase(CamelCaseInput):
    institucion_nombre: str = Field(..., min_length=1, max_length=150)
    institucion_email_contacto: EmailStr | None = None
    descripcion: str | None = None
    dominios_permitidos: list[str] = Field(default_factory=list)
    ips_permitidas: list[str] = Field(default_factory=list)
    capas_permitidas: list[str] = Field(default_factory=list)
    cuota_diaria: int | None = Field(default=None, ge=1, le=10_000_000)
    cuota_mensual: int | None = Field(default=None, ge=1, le=300_000_000)
    expira_en: datetime | None = None
    notas_admin: str | None = None


class MapalabApiKeyCreate(MapalabApiKeyBase):
    visibility: Visibility = "public"


class MapalabApiKeyUpdate(CamelCaseInput):
    institucion_nombre: str | None = Field(default=None, min_length=1, max_length=150)
    institucion_email_contacto: EmailStr | None = None
    descripcion: str | None = None
    dominios_permitidos: list[str] | None = None
    ips_permitidas: list[str] | None = None
    capas_permitidas: list[str] | None = None
    cuota_diaria: int | None = Field(default=None, ge=1, le=10_000_000)
    cuota_mensual: int | None = Field(default=None, ge=1, le=300_000_000)
    expira_en: datetime | None = None
    notas_admin: str | None = None


class MapalabApiKeyResponse(BaseModel):
    id: int
    institucion_nombre: str = Field(..., serialization_alias="institucionNombre")
    institucion_email_contacto: str | None = Field(default=None, serialization_alias="institucionEmailContacto")
    descripcion: str | None = None
    visibility: Visibility
    key_prefix: str = Field(..., serialization_alias="keyPrefix")
    dominios_permitidos: list[str] = Field(default_factory=list, serialization_alias="dominiosPermitidos")
    ips_permitidas: list[str] = Field(default_factory=list, serialization_alias="ipsPermitidas")
    capas_permitidas: list[str] = Field(default_factory=list, serialization_alias="capasPermitidas")
    cuota_diaria: int | None = Field(default=None, serialization_alias="cuotaDiaria")
    cuota_mensual: int | None = Field(default=None, serialization_alias="cuotaMensual")
    estado: Estado
    expira_en: datetime | None = Field(default=None, serialization_alias="expiraEn")
    notas_admin: str | None = Field(default=None, serialization_alias="notasAdmin")
    creado_por_user_id: int | None = Field(default=None, serialization_alias="creadoPorUserId")
    creado_en: datetime = Field(..., serialization_alias="creadoEn")
    actualizado_en: datetime = Field(..., serialization_alias="actualizadoEn")
    usado_en: datetime | None = Field(default=None, serialization_alias="usadoEn")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MapalabApiKeyRevealResponse(BaseModel):
    api_key: MapalabApiKeyResponse = Field(..., serialization_alias="apiKey")
    plain_key: str = Field(..., serialization_alias="plainKey")
    warning: str = "Esta clave NO se mostrará otra vez. Cópiala ahora."

    model_config = ConfigDict(populate_by_name=True)


class MapalabApiKeyRotateRequest(CamelCaseInput):
    visibility: Visibility | None = None


class MapalabApiKeyEventoResponse(BaseModel):
    id: int
    api_key_id: int = Field(..., serialization_alias="apiKeyId")
    evento: str
    actor_user_id: int | None = Field(default=None, serialization_alias="actorUserId")
    payload: dict | None = None
    creado_en: datetime = Field(..., serialization_alias="creadoEn")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MapalabApiKeyUsoDiarioResponse(BaseModel):
    api_key_id: int = Field(..., serialization_alias="apiKeyId")
    dia: datetime
    requests: int
    errores: int
    bytes_out: int = Field(..., serialization_alias="bytesOut")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MapalabApiKeyValidateRequest(CamelCaseInput):
    key: str = Field(..., min_length=8, max_length=120)
    origin: str | None = None
    ip: str | None = None
    requested_layers: list[str] = Field(default_factory=list)


class MapalabApiKeyUsageItem(CamelCaseInput):
    key_id: int
    dia: str
    requests: int = 0
    errores: int = 0
    bytes_out: int = 0


class MapalabApiKeyUsageBatch(CamelCaseInput):
    items: list[MapalabApiKeyUsageItem] = Field(default_factory=list)


class MapalabApiKeyValidateResponse(BaseModel):
    valid: bool
    key_id: int | None = Field(default=None, serialization_alias="keyId")
    visibility: Visibility | None = None
    capas_permitidas: list[str] = Field(default_factory=list, serialization_alias="capasPermitidas")
    dominios_permitidos: list[str] = Field(default_factory=list, serialization_alias="dominiosPermitidos")
    cuota_diaria: int | None = Field(default=None, serialization_alias="cuotaDiaria")
    cuota_mensual: int | None = Field(default=None, serialization_alias="cuotaMensual")
    institucion_nombre: str | None = Field(default=None, serialization_alias="institucionNombre")
    reason: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class MapalabApiKeyAccesoItem(CamelCaseInput):
    api_key_id: int
    timestamp: datetime
    endpoint: str = Field(..., max_length=20)
    resultado: str = Field(..., max_length=20)
    motivo: str | None = Field(default=None, max_length=120)
    origin: str | None = Field(default=None, max_length=255)
    ip_hash: str | None = Field(default=None, max_length=64)
    layers: list[str] = Field(default_factory=list)
    request_id: str | None = Field(default=None, max_length=40)


class MapalabApiKeyAccesoBatch(CamelCaseInput):
    items: list[MapalabApiKeyAccesoItem] = Field(default_factory=list)


class MapalabApiKeyAccesoResponse(BaseModel):
    id: int
    api_key_id: int = Field(..., serialization_alias="apiKeyId")
    timestamp: datetime
    endpoint: str
    resultado: str
    motivo: str | None = None
    origin: str | None = None
    ip_hash: str | None = Field(default=None, serialization_alias="ipHash")
    layers: list[str] = Field(default_factory=list)
    request_id: str | None = Field(default=None, serialization_alias="requestId")
    clasificacion: str | None = None
    sla_estado: str | None = Field(default=None, serialization_alias="slaEstado")
    linaje_ref: dict | None = Field(default=None, serialization_alias="linajeRef")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MapalabApiKeyAccesoPage(BaseModel):
    items: list[MapalabApiKeyAccesoResponse] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    size: int = 50

    model_config = ConfigDict(populate_by_name=True)


class MapalabApiKeyEmbedCreate(CamelCaseInput):
    share_id: str = Field(..., min_length=1, max_length=10, pattern=r"^[a-z0-9]+$")
    label: str | None = Field(default=None, max_length=150)


class MapalabApiKeyEmbedLayerEntry(CamelCaseInput):
    slug: str = Field(..., min_length=1, max_length=120)
    opacity: float | None = Field(default=None, ge=0.0, le=1.0)


class MapalabApiKeyEmbedView(CamelCaseInput):
    lon: float | None = None
    lat: float | None = None
    zoom: float | None = Field(default=None, ge=1.0, le=22.0)


class MapalabApiKeyEmbedFromLayers(CamelCaseInput):
    layers: list[MapalabApiKeyEmbedLayerEntry] = Field(..., min_length=1)
    view: MapalabApiKeyEmbedView | None = None
    label: str | None = Field(default=None, max_length=150)


class MapalabApiKeyEmbedSummary(BaseModel):
    layers: list[str] = Field(default_factory=list)
    view: dict | None = None

    model_config = ConfigDict(populate_by_name=True)


class MapalabApiKeyEmbedResponse(BaseModel):
    id: int
    api_key_id: int = Field(..., serialization_alias="apiKeyId")
    share_id: str = Field(..., serialization_alias="shareId")
    label: str | None = None
    creado_por_user_id: int | None = Field(default=None, serialization_alias="creadoPorUserId")
    creado_en: datetime = Field(..., serialization_alias="creadoEn")
    pinned_until: datetime | None = Field(default=None, serialization_alias="pinnedUntil")
    permanent: bool = False
    share_kind: str | None = Field(default=None, serialization_alias="shareKind")
    share_exists: bool = Field(default=True, serialization_alias="shareExists")
    summary: MapalabApiKeyEmbedSummary | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
