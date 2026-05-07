from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.schemas._camel import CamelCaseInput


class SourceAppCreate(CamelCaseInput):
    slug: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-z0-9_-]+$")
    nombre: str = Field(..., min_length=1, max_length=150)
    descripcion: str | None = None
    dominios_permitidos: list[str] = Field(default_factory=list)
    tipos_permitidos: list[str] | None = None
    rate_limit_per_hour: int = Field(default=60, ge=1, le=10000)
    branding: dict | None = None
    notificar_discord: bool = True
    discord_webhook_url: str | None = Field(default=None, max_length=500)
    disable_pii: bool = False
    privacy_url: str | None = Field(default=None, max_length=500)
    scrubbers: list[dict] | None = None
    activo: bool = False


class SourceAppUpdate(CamelCaseInput):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    descripcion: str | None = None
    dominios_permitidos: list[str] | None = None
    tipos_permitidos: list[str] | None = None
    rate_limit_per_hour: int | None = Field(default=None, ge=1, le=10000)
    branding: dict | None = None
    notificar_discord: bool | None = None
    discord_webhook_url: str | None = Field(default=None, max_length=500)
    disable_pii: bool | None = None
    privacy_url: str | None = Field(default=None, max_length=500)
    scrubbers: list[dict] | None = None
    activo: bool | None = None


class SourceAppResponse(BaseModel):
    id: int
    slug: str
    nombre: str
    descripcion: str | None = None
    api_key_prefix: str | None = Field(default=None, serialization_alias="apiKeyPrefix")
    has_api_key: bool = Field(default=False, serialization_alias="hasApiKey")
    dominios_permitidos: list[str] = Field(default_factory=list, serialization_alias="dominiosPermitidos")
    tipos_permitidos: list[str] | None = Field(default=None, serialization_alias="tiposPermitidos")
    rate_limit_per_hour: int = Field(..., serialization_alias="rateLimitPerHour")
    branding: dict | None = None
    notificar_discord: bool = Field(..., serialization_alias="notificarDiscord")
    discord_webhook_url: str | None = Field(default=None, serialization_alias="discordWebhookUrl")
    disable_pii: bool = Field(default=False, serialization_alias="disablePii")
    privacy_url: str | None = Field(default=None, serialization_alias="privacyUrl")
    scrubbers: list[dict] | None = None
    activo: bool
    creado_en: datetime = Field(..., serialization_alias="creadoEn")
    actualizado_en: datetime = Field(..., serialization_alias="actualizadoEn")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SourceAppKeyRotateRequest(CamelCaseInput):
    visibility: Literal["public", "private"] = "public"


class SourceAppKeyRotateResponse(BaseModel):
    plain_key: str = Field(..., serialization_alias="plainKey")
    api_key_prefix: str = Field(..., serialization_alias="apiKeyPrefix")
    visibility: Literal["public", "private"]
    warning: str = "Esta clave NO se mostrará otra vez. Cópiala ahora."
