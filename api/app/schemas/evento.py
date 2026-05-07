from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator, model_validator

from app.core.acervo_url import to_absolute, to_relative
from app.core.eventos import EventoEstado
from app.schemas._camel import CamelCaseInput

URL_MAX_LENGTH = 2048
ALIAS_MAX_LENGTH = 200
DESCRIPCION_MAX_LENGTH = 2000


class CapaRef(CamelCaseInput):
    tipo: Literal['capa', 'etiqueta'] = 'capa'
    workspace: str | None = Field(default=None, max_length=200)
    layer: str | None = Field(default=None, max_length=200)
    alias: str | None = Field(default=None, max_length=ALIAS_MAX_LENGTH)
    orden: int = 0
    auto_activar: bool = Field(default=True, serialization_alias='autoActivar')

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode='after')
    def _validate_consistencia(self):
        if self.tipo == 'capa':
            if not (self.workspace and self.workspace.strip()):
                raise ValueError('Las capas requieren `workspace`')
            if not (self.layer and self.layer.strip()):
                raise ValueError('Las capas requieren `layer`')
        elif self.tipo == 'etiqueta':
            if not (self.alias and self.alias.strip()):
                raise ValueError('Las etiquetas requieren un texto en `alias`')
        return self


class BBox(CamelCaseInput):
    minx: float = Field(ge=-180, le=180)
    miny: float = Field(ge=-90, le=90)
    maxx: float = Field(ge=-180, le=180)
    maxy: float = Field(ge=-90, le=90)

    @model_validator(mode='after')
    def _validate_extent(self):
        if self.maxx < self.minx:
            raise ValueError('maxx debe ser >= minx')
        if self.maxy < self.miny:
            raise ValueError('maxy debe ser >= miny')
        return self


def _validate_image_url(v: str | None) -> str | None:
    if v is None:
        return None
    if not isinstance(v, str):
        raise ValueError('debe ser texto')
    s = v.strip()
    if not s:
        return None
    if len(s) > URL_MAX_LENGTH:
        raise ValueError(f'URL excede {URL_MAX_LENGTH} caracteres')
    lowered = s.lower()
    allowed_prefixes = ('http://', 'https://', '/acervo/', '/', 'data:image/')
    if not any(lowered.startswith(p) for p in allowed_prefixes):
        raise ValueError('URL debe ser http(s), data:image/, o ruta relativa')
    return s


class EventoBase(CamelCaseInput):
    titulo: str = Field(..., min_length=1, max_length=200)
    descripcion: str | None = Field(default=None, max_length=DESCRIPCION_MAX_LENGTH)
    icono_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='iconoUrl')
    imagen_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='imagenUrl')
    bbox: BBox | None = None
    capas: list[CapaRef] = Field(default_factory=list)
    activo: bool = False
    fecha_inicio: datetime | None = Field(default=None, serialization_alias='fechaInicio')
    fecha_fin: datetime | None = Field(default=None, serialization_alias='fechaFin')
    orden: int = 0

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('icono_url', 'imagen_url', mode='before')
    @classmethod
    def _store_relative(cls, v):
        return _validate_image_url(to_relative(v))

    @field_serializer('icono_url', 'imagen_url', when_used='json-unless-none')
    def _expose_absolute(self, v):
        return to_absolute(v)


class EventoCreate(EventoBase):
    slug: str | None = Field(default=None, min_length=1, max_length=120)


class EventoUpdate(CamelCaseInput):
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    descripcion: str | None = Field(default=None, max_length=DESCRIPCION_MAX_LENGTH)
    icono_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='iconoUrl')
    imagen_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='imagenUrl')
    bbox: BBox | None = None
    capas: list[CapaRef] | None = None
    activo: bool | None = None
    fecha_inicio: datetime | None = Field(default=None, serialization_alias='fechaInicio')
    fecha_fin: datetime | None = Field(default=None, serialization_alias='fechaFin')
    orden: int | None = None
    slug: str | None = Field(default=None, min_length=1, max_length=120)
    expected_updated_at: datetime | None = Field(default=None, alias='expectedUpdatedAt')

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('icono_url', 'imagen_url', mode='before')
    @classmethod
    def _store_relative(cls, v):
        return _validate_image_url(to_relative(v))


class EventoResponse(EventoBase):
    id: int
    slug: str
    estado: EventoEstado
    created_at: datetime = Field(..., serialization_alias='createdAt')
    updated_at: datetime = Field(..., serialization_alias='updatedAt')
    published_at: datetime | None = Field(default=None, serialization_alias='publishedAt')

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class EventoPublicResponse(BaseModel):
    id: int
    slug: str
    titulo: str
    descripcion: str | None = None
    icono_url: str | None = Field(default=None, serialization_alias='iconoUrl')
    imagen_url: str | None = Field(default=None, serialization_alias='imagenUrl')
    bbox: BBox | None = None
    capas: list[CapaRef] = Field(default_factory=list)
    fecha_inicio: datetime | None = Field(default=None, serialization_alias='fechaInicio')
    fecha_fin: datetime | None = Field(default=None, serialization_alias='fechaFin')
    orden: int = 0

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_serializer('icono_url', 'imagen_url', when_used='json-unless-none')
    def _expose_absolute(self, v):
        return to_absolute(v)
