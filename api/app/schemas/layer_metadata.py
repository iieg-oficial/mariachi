from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Fuentes(BaseModel):
    corto: str | None = None
    largo: str | None = None
    enlace: str | None = None


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


class StatsConfigItem(BaseModel):
    posicion: int
    nombre: str
    simbolo: str | None = None
    query: str | None = None
    format: str | None = None


class LayerMetadataBase(BaseModel):
    layer_key: str = Field(..., serialization_alias='layerKey')
    workspace: str | None = None
    layer_name_db: str | None = Field(default=None, serialization_alias='layerNameDb')
    layer_name_usuario: str | None = Field(default=None, serialization_alias='layerNameUsuario')
    descripcion: str | None = None
    fuentes: Fuentes | None = None
    metodologia: Metodologia | None = None
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


class LayerMetadataUpdate(BaseModel):
    workspace: str | None = None
    layer_name_db: str | None = Field(default=None, serialization_alias='layerNameDb')
    layer_name_usuario: str | None = Field(default=None, serialization_alias='layerNameUsuario')
    descripcion: str | None = None
    fuentes: Fuentes | None = None
    metodologia: Metodologia | None = None
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


class LayerStatsResponse(BaseModel):
    layer_key: str = Field(..., serialization_alias='layerKey')
    stats_config: list[StatsConfigItem] = Field(default_factory=list, serialization_alias='statsConfig')
    values: list[NumeraliaValue] = Field(default_factory=list)
    pie_numeralia: str | None = Field(default=None, serialization_alias='pieNumeralia')
    values_refreshed_at: datetime | None = Field(default=None, serialization_alias='valuesRefreshedAt')
    ttl_minutes: int = Field(default=1440, serialization_alias='ttlMinutes')

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LayerStatsUpdate(BaseModel):
    stats_config: list[StatsConfigItem] | None = Field(default=None, serialization_alias='statsConfig')
    values: list[NumeraliaValue] | None = None
    pie_numeralia: str | None = Field(default=None, serialization_alias='pieNumeralia')
    ttl_minutes: int | None = Field(default=None, serialization_alias='ttlMinutes')

    model_config = ConfigDict(populate_by_name=True)
