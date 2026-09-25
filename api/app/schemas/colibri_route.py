from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas._camel import CamelCaseInput

DestinoType = Literal["discord", "slack", "webhook", "email"]


class ColibriRouteCreate(CamelCaseInput):
    nombre: str = Field(..., min_length=1, max_length=150)
    source_app_id: int | None = Field(default=None, alias="sourceAppId")
    tipo_id: int | None = Field(default=None, alias="tipoId")
    destino: DestinoType
    config: dict = Field(default_factory=dict)
    filtros: dict | None = None
    activo: bool = True
    orden: int = 0

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def _validate_config(self) -> "ColibriRouteCreate":
        if self.destino in {"discord", "slack", "webhook"}:
            url = self.config.get("url")
            if not url or not isinstance(url, str):
                raise ValueError(f"Destino '{self.destino}' requiere config.url")
            if not url.lower().startswith("https://"):
                raise ValueError(f"Destino '{self.destino}' requiere una config.url https")
        if self.destino == "email":
            to = self.config.get("to")
            if not to:
                raise ValueError("Destino 'email' requiere config.to")
        return self


class ColibriRouteUpdate(CamelCaseInput):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    source_app_id: int | None = Field(default=None, alias="sourceAppId")
    tipo_id: int | None = Field(default=None, alias="tipoId")
    destino: DestinoType | None = None
    config: dict | None = None
    filtros: dict | None = None
    activo: bool | None = None
    orden: int | None = None

    model_config = ConfigDict(populate_by_name=True)


class ColibriRouteResponse(BaseModel):
    id: int
    nombre: str
    source_app_id: int | None = Field(default=None, serialization_alias="sourceAppId")
    tipo_id: int | None = Field(default=None, serialization_alias="tipoId")
    destino: DestinoType
    config: dict
    filtros: dict | None = None
    activo: bool
    orden: int
    creado_en: datetime = Field(..., serialization_alias="creadoEn")
    actualizado_en: datetime = Field(..., serialization_alias="actualizadoEn")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
