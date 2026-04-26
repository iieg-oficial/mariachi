from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CapaRef(BaseModel):
    workspace: str = Field(..., min_length=1)
    layer: str = Field(..., min_length=1)
    alias: str | None = None
    orden: int = 0


class BBox(BaseModel):
    minx: float
    miny: float
    maxx: float
    maxy: float

    @field_validator('maxx')
    @classmethod
    def validate_x(cls, v, info):
        minx = info.data.get('minx')
        if minx is not None and v < minx:
            raise ValueError('maxx debe ser >= minx')
        return v

    @field_validator('maxy')
    @classmethod
    def validate_y(cls, v, info):
        miny = info.data.get('miny')
        if miny is not None and v < miny:
            raise ValueError('maxy debe ser >= miny')
        return v


class EventoBase(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)
    descripcion: str | None = None
    icono_url: str | None = Field(default=None, serialization_alias='iconoUrl')
    bbox: BBox | None = None
    capas: list[CapaRef] = Field(default_factory=list)
    activo: bool = False
    fecha_inicio: datetime | None = Field(default=None, serialization_alias='fechaInicio')
    fecha_fin: datetime | None = Field(default=None, serialization_alias='fechaFin')
    orden: int = 0

    model_config = ConfigDict(populate_by_name=True)


class EventoCreate(EventoBase):
    slug: str | None = Field(default=None, min_length=1, max_length=120)


class EventoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    descripcion: str | None = None
    icono_url: str | None = Field(default=None, serialization_alias='iconoUrl')
    bbox: BBox | None = None
    capas: list[CapaRef] | None = None
    activo: bool | None = None
    fecha_inicio: datetime | None = Field(default=None, serialization_alias='fechaInicio')
    fecha_fin: datetime | None = Field(default=None, serialization_alias='fechaFin')
    orden: int | None = None
    slug: str | None = Field(default=None, min_length=1, max_length=120)

    model_config = ConfigDict(populate_by_name=True)


class EventoResponse(EventoBase):
    id: int
    slug: str
    estado: Literal['draft', 'published']
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
    bbox: BBox | None = None
    capas: list[CapaRef] = Field(default_factory=list)
    fecha_inicio: datetime | None = Field(default=None, serialization_alias='fechaInicio')
    fecha_fin: datetime | None = Field(default=None, serialization_alias='fechaFin')
    orden: int = 0

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
