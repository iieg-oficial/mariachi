from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

NodeType = Literal["tema", "category", "label", "group", "leaf"]


class WorkspaceBase(BaseModel):
    alias: str = Field(..., min_length=1, max_length=50)
    geoserver_workspace: str = Field(..., min_length=1, max_length=200, serialization_alias="geoserverWorkspace")
    db_schema: str = Field(..., min_length=1, max_length=200, serialization_alias="dbSchema")
    label: str | None = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class WorkspaceResponse(WorkspaceBase):
    created_at: datetime = Field(..., serialization_alias="createdAt")


class LayerBase(BaseModel):
    id: str = Field(..., min_length=1, max_length=100)
    parent_id: str | None = Field(default=None, serialization_alias="parentId")
    label: str = Field(..., min_length=1, max_length=255)
    sort_order: int = Field(default=0, serialization_alias="sortOrder")
    node_type: NodeType = Field(..., serialization_alias="nodeType")

    hidden_in_menu: bool = Field(default=False, serialization_alias="hiddenInMenu")
    disabled: bool = False

    workspace_alias: str | None = Field(default=None, serialization_alias="workspaceAlias")
    geoserver_layer: str | None = Field(default=None, max_length=200, serialization_alias="geoserverLayer")
    styles: str = ""
    cql_filter: str = Field(default="", serialization_alias="cqlFilter")
    wms_group: str | None = Field(default=None, max_length=100, serialization_alias="wmsGroup")

    wfs_available: bool = Field(default=True, serialization_alias="wfsAvailable")
    wfs_layer_name: str | None = Field(default=None, max_length=200, serialization_alias="wfsLayerName")
    downloadable: bool = True

    metadata_layer: str | None = Field(default=None, max_length=200, serialization_alias="metadataLayer")

    default_date: Any = Field(default=None, serialization_alias="defaultDate")
    time_enabled: bool = Field(default=False, serialization_alias="timeEnabled")
    time_style_pattern: str | None = Field(default=None, max_length=200, serialization_alias="timeStylePattern")
    raster_periodicity: dict | None = Field(default=None, serialization_alias="rasterPeriodicity")
    hide_periodicity: bool = Field(default=False, serialization_alias="hidePeriodicity")

    default_zoom: Any = Field(default=None, serialization_alias="defaultZoom")
    zoom_range: dict | None = Field(default=None, serialization_alias="zoomRange")

    search_tags: list[str] | None = Field(default=None, serialization_alias="searchTags")
    searchable_fields: list[str] | None = Field(default=None, serialization_alias="searchableFields")
    has_municipio: bool = Field(default=False, serialization_alias="hasMunicipio")
    has_direccion: bool = Field(default=False, serialization_alias="hasDireccion")
    municipio_field: str | None = Field(default=None, max_length=100, serialization_alias="municipioField")
    direccion_field: str | None = Field(default=None, max_length=100, serialization_alias="direccionField")

    infobox_template: str | None = Field(default=None, max_length=50, serialization_alias="infoboxTemplate")
    infobox_params: dict | None = Field(default=None, serialization_alias="infoboxParams")
    infobox_config: dict | None = Field(default=None, serialization_alias="infoboxConfig")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LayerCreate(LayerBase):
    pass


class LayerUpdate(BaseModel):
    parent_id: str | None = Field(default=None, serialization_alias="parentId")
    label: str | None = Field(default=None, max_length=255)
    sort_order: int | None = Field(default=None, serialization_alias="sortOrder")
    node_type: NodeType | None = Field(default=None, serialization_alias="nodeType")

    hidden_in_menu: bool | None = Field(default=None, serialization_alias="hiddenInMenu")
    disabled: bool | None = None

    workspace_alias: str | None = Field(default=None, serialization_alias="workspaceAlias")
    geoserver_layer: str | None = Field(default=None, serialization_alias="geoserverLayer")
    styles: str | None = None
    cql_filter: str | None = Field(default=None, serialization_alias="cqlFilter")
    wms_group: str | None = Field(default=None, serialization_alias="wmsGroup")

    wfs_available: bool | None = Field(default=None, serialization_alias="wfsAvailable")
    wfs_layer_name: str | None = Field(default=None, serialization_alias="wfsLayerName")
    downloadable: bool | None = None

    metadata_layer: str | None = Field(default=None, serialization_alias="metadataLayer")

    default_date: Any = Field(default=None, serialization_alias="defaultDate")
    time_enabled: bool | None = Field(default=None, serialization_alias="timeEnabled")
    time_style_pattern: str | None = Field(default=None, serialization_alias="timeStylePattern")
    raster_periodicity: dict | None = Field(default=None, serialization_alias="rasterPeriodicity")
    hide_periodicity: bool | None = Field(default=None, serialization_alias="hidePeriodicity")

    default_zoom: Any = Field(default=None, serialization_alias="defaultZoom")
    zoom_range: dict | None = Field(default=None, serialization_alias="zoomRange")

    search_tags: list[str] | None = Field(default=None, serialization_alias="searchTags")
    searchable_fields: list[str] | None = Field(default=None, serialization_alias="searchableFields")
    has_municipio: bool | None = Field(default=None, serialization_alias="hasMunicipio")
    has_direccion: bool | None = Field(default=None, serialization_alias="hasDireccion")
    municipio_field: str | None = Field(default=None, serialization_alias="municipioField")
    direccion_field: str | None = Field(default=None, serialization_alias="direccionField")

    infobox_template: str | None = Field(default=None, serialization_alias="infoboxTemplate")
    infobox_params: dict | None = Field(default=None, serialization_alias="infoboxParams")
    infobox_config: dict | None = Field(default=None, serialization_alias="infoboxConfig")

    model_config = ConfigDict(populate_by_name=True)


class LayerResponse(LayerBase):
    created_at: datetime = Field(..., serialization_alias="createdAt")
    updated_at: datetime = Field(..., serialization_alias="updatedAt")
    updated_by: str | None = Field(default=None, serialization_alias="updatedBy")


class LayerTreeNode(LayerBase):
    children: list["LayerTreeNode"] = Field(default_factory=list)


LayerTreeNode.model_rebuild()


class ReorderBody(BaseModel):
    parent_id: str | None = Field(default=None, serialization_alias="parentId")
    order: list[str]

    model_config = ConfigDict(populate_by_name=True)


class InitialOrderBody(BaseModel):
    layers: list[str]


class InitialOrderItem(BaseModel):
    layer_id: str = Field(..., serialization_alias="layerId")
    sort_order: int = Field(..., serialization_alias="sortOrder")
    label: str
    node_type: str = Field(..., serialization_alias="nodeType")
    parent_id: str | None = Field(default=None, serialization_alias="parentId")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
