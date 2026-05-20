import re
from datetime import datetime
from typing import Literal

from pydantic import (
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    model_validator,
)

from app.core.acervo_url import to_absolute, to_relative
from app.core.bucket_policies import KNOWN_ACERVO_BUCKETS
from app.core.eventos import EventoEstado
from app.schemas._camel import CamelCaseInput

URL_MAX_LENGTH = 2048
ALIAS_MAX_LENGTH = 200
DESCRIPCION_MAX_LENGTH = 2000


class CapaRef(CamelCaseInput):
    tipo: Literal['capa', 'etiqueta', 'categoria'] = 'capa'
    workspace: str | None = Field(default=None, max_length=200)
    layer: str | None = Field(default=None, max_length=200)
    alias: str | None = Field(default=None, max_length=ALIAS_MAX_LENGTH)
    orden: int = 0
    auto_activar: bool = Field(default=True, serialization_alias='autoActivar')
    capas: list['CapaRef'] | None = None

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode='after')
    def _validate_consistencia(self):
        if self.tipo == 'capa':
            if not (self.workspace and self.workspace.strip()):
                raise ValueError('Las capas requieren `workspace`')
            if not (self.layer and self.layer.strip()):
                raise ValueError('Las capas requieren `layer`')
            if self.capas is not None:
                raise ValueError('Las capas no pueden contener sub-`capas`')
        elif self.tipo == 'etiqueta':
            if not (self.alias and self.alias.strip()):
                raise ValueError('Las etiquetas requieren un texto en `alias`')
            if self.capas is not None:
                raise ValueError('Las etiquetas no pueden contener sub-`capas`')
        elif self.tipo == 'categoria':
            if not (self.alias and self.alias.strip()):
                raise ValueError('Las categorias requieren un texto en `alias`')
            for child in self.capas or []:
                if child.tipo == 'categoria':
                    raise ValueError('Las categorias no pueden anidarse (profundidad maxima: 1)')
        return self


CapaRef.model_rebuild()


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


_ACERVO_PATH_RE = re.compile(r'^([a-z0-9][a-z0-9_\-]*)/([\w\-/.]+)$', re.IGNORECASE)


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
    if any(lowered.startswith(p) for p in allowed_prefixes):
        return s
    match = _ACERVO_PATH_RE.match(s)
    if match:
        bucket = match.group(1).lower()
        path = match.group(2)
        if bucket not in KNOWN_ACERVO_BUCKETS:
            raise ValueError(
                f'bucket "{bucket}" no es un bucket registrado del acervo'
            )
        if '..' in path.split('/'):
            raise ValueError('path no puede contener ".." (path traversal)')
        return s
    raise ValueError(
        'URL debe ser http(s), data:image/, ruta relativa o path del acervo '
        '(bucket/object con bucket registrado)'
    )


class _ImageUrlMixin:
    @field_validator('icono_url', 'imagen_url', mode='before', check_fields=False)
    @classmethod
    def _store_relative(cls, v):
        return _validate_image_url(to_relative(v))

    @field_serializer('icono_url', 'imagen_url', when_used='json-unless-none', check_fields=False)
    def _expose_absolute(self, v):
        return to_absolute(v)


class _EventoVisibleFields(CamelCaseInput, _ImageUrlMixin):
    """Campos del evento expuestos al visor publico y compartidos por
    EventoBase (admin) y EventoPublicResponse (visor)."""

    titulo: str = Field(..., min_length=1, max_length=200)
    descripcion: str | None = Field(default=None, max_length=DESCRIPCION_MAX_LENGTH)
    icono_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='iconoUrl')
    imagen_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='imagenUrl')
    bbox: BBox | None = None
    capas: list[CapaRef] = Field(default_factory=list)
    fecha_inicio: datetime | None = Field(default=None, serialization_alias='fechaInicio')
    fecha_fin: datetime | None = Field(default=None, serialization_alias='fechaFin')
    orden: int = 0

    model_config = ConfigDict(populate_by_name=True)


class EventoBase(_EventoVisibleFields):
    """Campos manipulables por admin (incluye `activo`)."""

    activo: bool = False


class EventoCreate(EventoBase):
    slug: str | None = Field(default=None, min_length=1, max_length=120)


class EventoUpdate(CamelCaseInput, _ImageUrlMixin):
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


class EventoResponse(EventoBase):
    id: int
    slug: str
    estado: EventoEstado
    created_at: datetime = Field(..., serialization_alias='createdAt')
    updated_at: datetime = Field(..., serialization_alias='updatedAt')
    published_at: datetime | None = Field(default=None, serialization_alias='publishedAt')

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class EventoPublicResponse(_EventoVisibleFields):
    id: int
    slug: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
