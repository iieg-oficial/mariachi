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
from app.schemas.evento_diversion import (
    AVISO_MAX_LENGTH,
    Animacion,
    BotonEstilo,
    Decoracion,
    DestinoDato,
    DiversionMixin,
    ModoEvento,
)

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
    abrir_detalle: bool = Field(default=False, serialization_alias='abrirDetalle')
    oculto: bool = False
    z: int | None = Field(default=None, ge=-9999, le=9999)
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
            if self.z is not None:
                raise ValueError('Las etiquetas no admiten `z` (no se renderizan en el mapa)')
            if self.abrir_detalle:
                raise ValueError('Las etiquetas no admiten `abrirDetalle`')
        elif self.tipo == 'categoria':
            if not (self.alias and self.alias.strip()):
                raise ValueError('Las categorias requieren un texto en `alias`')
            if self.z is not None:
                raise ValueError('Las categorias no admiten `z` (no se renderizan en el mapa)')
            if self.abrir_detalle:
                raise ValueError('Las categorias no admiten `abrirDetalle`')
            for child in self.capas or []:
                if child.tipo == 'categoria':
                    raise ValueError('Las categorias no pueden anidarse (profundidad maxima: 1)')
        return self


CapaRef.model_rebuild()


class SymbolSnapshot(CamelCaseInput):
    symbol_id: int | None = Field(default=None, serialization_alias='symbolId')
    kind: Literal['emoji', 'svg', 'image']
    value: str | None = None
    image_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='imageUrl')
    name: str | None = Field(default=None, max_length=200)

    model_config = ConfigDict(populate_by_name=True)


class FactRef(CamelCaseInput):
    text: str = Field(min_length=1, max_length=500)
    symbol: SymbolSnapshot | None = None
    animacion: Animacion | None = None
    destino: DestinoDato | None = None

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode='before')
    @classmethod
    def _accept_string_legacy(cls, data):
        if isinstance(data, str):
            return {'text': data}
        return data


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


class _EventoVisibleFields(CamelCaseInput, _ImageUrlMixin, DiversionMixin):
    """Campos del evento expuestos al visor publico y compartidos por
    EventoBase (admin) y EventoPublicResponse (visor)."""

    titulo: str = Field(..., min_length=1, max_length=200)
    descripcion: str | None = Field(default=None, max_length=DESCRIPCION_MAX_LENGTH)
    icono_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='iconoUrl')
    imagen_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='imagenUrl')
    bbox: BBox | None = None
    capas: list[CapaRef] = Field(default_factory=list)
    facts: list[FactRef] = Field(default_factory=list)
    fun_icon: SymbolSnapshot | None = Field(default=None, serialization_alias='funIcon')
    basemap_id: str | None = Field(default=None, max_length=50, serialization_alias='basemapId')
    modo: ModoEvento = 'completo'
    animacion: Animacion = 'pelota'
    decoracion: Decoracion = 'ninguna'
    boton_estilo: BotonEstilo | None = Field(default=None, serialization_alias='botonEstilo')
    aviso_inicial: str | None = Field(default=None, max_length=AVISO_MAX_LENGTH, serialization_alias='avisoInicial')
    fecha_inicio: datetime | None = Field(default=None, serialization_alias='fechaInicio')
    fecha_fin: datetime | None = Field(default=None, serialization_alias='fechaFin')
    orden: int = 0

    model_config = ConfigDict(populate_by_name=True)


class EventoBase(_EventoVisibleFields):
    """Campos manipulables por admin (incluye `activo`)."""

    activo: bool = False


class EventoCreate(EventoBase):
    slug: str | None = Field(default=None, min_length=1, max_length=120)


class EventoUpdate(CamelCaseInput, _ImageUrlMixin, DiversionMixin):
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    descripcion: str | None = Field(default=None, max_length=DESCRIPCION_MAX_LENGTH)
    icono_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='iconoUrl')
    imagen_url: str | None = Field(default=None, max_length=URL_MAX_LENGTH, serialization_alias='imagenUrl')
    bbox: BBox | None = None
    capas: list[CapaRef] | None = None
    facts: list[FactRef] | None = None
    fun_icon: SymbolSnapshot | None = Field(default=None, serialization_alias='funIcon')
    basemap_id: str | None = Field(default=None, max_length=50, serialization_alias='basemapId')
    modo: ModoEvento | None = None
    animacion: Animacion | None = None
    decoracion: Decoracion | None = None
    boton_estilo: BotonEstilo | None = Field(default=None, serialization_alias='botonEstilo')
    aviso_inicial: str | None = Field(default=None, max_length=AVISO_MAX_LENGTH, serialization_alias='avisoInicial')
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

    @field_validator('capas', mode='after')
    @classmethod
    def _drop_hidden(cls, capas: list[CapaRef]) -> list[CapaRef]:
        visibles = []
        for capa in capas:
            if capa.oculto:
                continue
            if capa.capas:
                capa.capas = [child for child in capa.capas if not child.oculto]
            visibles.append(capa)
        return visibles


class OrphanLayerInfo(CamelCaseInput):
    id: str
    label: str | None = None
    workspace: str
    layer: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class EventoDeleteResponse(CamelCaseInput):
    message: str
    orphan_layers_deleted: int = Field(default=0, serialization_alias='orphanLayersDeleted')

    model_config = ConfigDict(populate_by_name=True)
