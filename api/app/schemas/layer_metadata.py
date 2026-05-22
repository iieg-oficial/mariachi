from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas._camel import CamelCaseInput
from app.services.bulk_ingest_parser import parse_date_iso, parse_number_with_symbol


class Fuentes(BaseModel):
    corto: str | None = None
    largo: str | None = None
    enlace: str | None = None
    enlace_label: str | None = Field(default=None, serialization_alias='enlaceLabel')

    model_config = ConfigDict(populate_by_name=True)


class Metodologia(BaseModel):
    texto: str | None = None
    archivo_enlace: str | None = Field(default=None, serialization_alias='archivoEnlace')

    model_config = ConfigDict(populate_by_name=True)


class MetadatoItem(BaseModel):
    nombre: str
    enlace: str


class NumeraliaValue(BaseModel):
    posicion: int
    valor: str | None = None
    nombre: str | None = None
    simbolo: str | None = None


class NumeraliaValueInput(BaseModel):
    """Variante de input: aplica estandar IIEG al valor y separa simbolo."""

    posicion: int
    valor: str | None = None
    nombre: str | None = None
    simbolo: str | None = None

    @model_validator(mode='before')
    @classmethod
    def _normalize_value_symbol(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        valor = data.get('valor')
        if valor in (None, ''):
            return data
        num, sym = parse_number_with_symbol(valor)
        out = dict(data)
        out['valor'] = num
        if sym and not out.get('simbolo'):
            out['simbolo'] = sym
        return out


class StatsConfigItem(BaseModel):
    posicion: int | None = None
    position: int | None = None
    nombre: str | None = None
    label: str | None = None
    simbolo: str | None = None
    symbol: str | None = None
    query: str | None = None
    format: str | None = None
    operation: str | None = None
    schema_: str | None = Field(default=None, alias='schema')
    table: str | None = None
    field: str | None = None
    where_field: str | None = None
    where_value: str | int | float | bool | None = None
    order_field: str | None = None
    value: str | int | float | None = None
    expression: dict | None = None

    model_config = ConfigDict(populate_by_name=True, extra='allow')


class LayerMetadataBase(CamelCaseInput):
    layer_key: str = Field(..., serialization_alias='layerKey')
    workspace: str | None = None
    layer_name_db: str | None = Field(default=None, serialization_alias='layerNameDb')
    layer_name_usuario: str | None = Field(default=None, serialization_alias='layerNameUsuario')
    descripcion: str | None = None
    fuentes: list[Fuentes] | Fuentes | None = None
    metodologia: list[Metodologia] | Metodologia | None = None
    metadato: list[MetadatoItem] | None = None
    frecuencia: str | None = None
    fecha_ultima: str | None = Field(default=None, serialization_alias='fechaUltima')
    tipo_mapa: str | None = Field(default=None, serialization_alias='tipoMapa')
    tipo_mapa_enlace: str | None = Field(default=None, serialization_alias='tipoMapaEnlace')
    texto_leyenda: str | None = Field(default=None, serialization_alias='textoLeyenda')
    tarjeta_punto_poligono: str | None = Field(default=None, serialization_alias='tarjetaPuntoPoligono')
    link_final_capa: str | None = Field(default=None, serialization_alias='linkFinalCapa')
    downloadable: bool = True

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LayerMetadataResponse(LayerMetadataBase):
    created_at: datetime = Field(..., serialization_alias='createdAt')
    updated_at: datetime = Field(..., serialization_alias='updatedAt')
    updated_by: str | None = Field(default=None, serialization_alias='updatedBy')


class LayerMetadataUpdate(CamelCaseInput):
    workspace: str | None = None
    layer_name_db: str | None = Field(default=None, serialization_alias='layerNameDb')
    layer_name_usuario: str | None = Field(default=None, serialization_alias='layerNameUsuario')
    descripcion: str | None = None
    fuentes: list[Fuentes] | Fuentes | None = None
    metodologia: list[Metodologia] | Metodologia | None = None
    metadato: list[MetadatoItem] | None = None
    frecuencia: str | None = None
    fecha_ultima: str | None = Field(default=None, serialization_alias='fechaUltima')
    tipo_mapa: str | None = Field(default=None, serialization_alias='tipoMapa')
    tipo_mapa_enlace: str | None = Field(default=None, serialization_alias='tipoMapaEnlace')
    texto_leyenda: str | None = Field(default=None, serialization_alias='textoLeyenda')
    tarjeta_punto_poligono: str | None = Field(default=None, serialization_alias='tarjetaPuntoPoligono')
    link_final_capa: str | None = Field(default=None, serialization_alias='linkFinalCapa')
    downloadable: bool | None = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('fecha_ultima', mode='before')
    @classmethod
    def _normalize_fecha_ultima(cls, v: Any) -> Any:
        return parse_date_iso(v) if v not in (None, '') else v


class LayerStatsResponse(BaseModel):
    layer_key: str = Field(..., serialization_alias='layerKey')
    stats_config: list[StatsConfigItem] = Field(default_factory=list, serialization_alias='statsConfig')
    values: list[NumeraliaValue] = Field(default_factory=list)
    pie_numeralia: str | None = Field(default=None, serialization_alias='pieNumeralia')
    values_refreshed_at: datetime | None = Field(default=None, serialization_alias='valuesRefreshedAt')
    ttl_minutes: int = Field(default=1440, serialization_alias='ttlMinutes')

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LayerStatsUpdate(CamelCaseInput):
    stats_config: list[StatsConfigItem] | None = Field(default=None, serialization_alias='statsConfig')
    values: list[NumeraliaValueInput] | None = None
    pie_numeralia: str | None = Field(default=None, serialization_alias='pieNumeralia')
    ttl_minutes: int | None = Field(default=None, serialization_alias='ttlMinutes')

    model_config = ConfigDict(populate_by_name=True)
