from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.core.acervo_url import to_absolute, to_relative
from app.schemas._camel import CamelCaseInput

NodeType = Literal["tema", "category", "label", "group", "leaf"]

SLUG_PATTERN = r"^[a-z0-9-]+$"

NoticeVariant = Literal["info", "warning", "neutral", "banner"]
NoticeSize = Literal["small", "medium", "large"]
NoticePosition = Literal["top-center", "bottom-center"]
NoticeDismissPersistence = Literal["permanent", "reopen"]
NoticeAnchorMode = Literal["viewport", "coord"]
NoticeArrowPosition = Literal["top", "right", "bottom", "left"]


class LayerNoticeAnchorCoord(CamelCaseInput):
    lon: float = Field(..., ge=-180, le=180)
    lat: float = Field(..., ge=-90, le=90)


class LayerNoticeCta(CamelCaseInput):
    label: str = Field(..., min_length=1, max_length=80)
    url: str = Field(..., min_length=1, max_length=500)


class LayerNoticeZoomRange(CamelCaseInput):
    min: float | None = Field(default=None, ge=0, le=24)
    max: float | None = Field(default=None, ge=0, le=24)


class LayerNotice(CamelCaseInput):
    enabled: bool = False
    title: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    icon: str | None = Field(default=None, max_length=60)
    variant: NoticeVariant = "info"
    size: NoticeSize = "large"
    position: NoticePosition = "top-center"
    dismissible: bool = True
    dismiss_persistence: NoticeDismissPersistence = Field(
        default="reopen", serialization_alias="dismissPersistence"
    )
    anchor_mode: NoticeAnchorMode = Field(default="viewport", serialization_alias="anchorMode")
    anchor_coord: LayerNoticeAnchorCoord | None = Field(default=None, serialization_alias="anchorCoord")
    arrow_position: NoticeArrowPosition = Field(default="bottom", serialization_alias="arrowPosition")
    valid_from: str | None = Field(default=None, serialization_alias="validFrom")
    valid_until: str | None = Field(default=None, serialization_alias="validUntil")
    zoom_range: LayerNoticeZoomRange | None = Field(default=None, serialization_alias="zoomRange")
    cta: LayerNoticeCta | None = None

    @field_validator("valid_from", "valid_until", mode="before")
    @classmethod
    def _validate_date(cls, v):
        if v in (None, ""):
            return None
        if isinstance(v, str):
            try:
                datetime.fromisoformat(v)
            except ValueError as exc:
                raise ValueError("Fecha invalida (esperado ISO 8601 YYYY-MM-DD)") from exc
            return v
        raise ValueError("Fecha debe ser string ISO 8601")


def _validate_slug(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    import re
    if not re.match(SLUG_PATTERN, value) or len(value) > 60:
        raise ValueError(
            "Slug invalido: solo minusculas, numeros y guiones; max 60 chars"
        )
    return value


class WorkspaceBase(BaseModel):
    alias: str = Field(..., min_length=1, max_length=50)
    geoserver_workspace: str = Field(..., min_length=1, max_length=200, serialization_alias="geoserverWorkspace")
    db_schema: str = Field(..., min_length=1, max_length=200, serialization_alias="dbSchema")
    label: str | None = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class WorkspaceResponse(WorkspaceBase):
    created_at: datetime = Field(..., serialization_alias="createdAt")


class WorkspaceCreate(BaseModel):
    geoserver_workspace: str = Field(..., min_length=1, max_length=200)
    alias: str = Field(..., min_length=1, max_length=50)
    db_schema: str = Field(..., min_length=1, max_length=200)
    label: str | None = Field(default=None, max_length=200)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("alias")
    @classmethod
    def _validate_alias_format(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9_-]+$", v):
            raise ValueError(
                "Alias invalido: solo minusculas, numeros, guion bajo y guion medio"
            )
        return v


class WorkspacePending(BaseModel):
    geoserver_workspace: str = Field(..., serialization_alias="geoserverWorkspace")
    layer_count: int = Field(..., serialization_alias="layerCount")

    model_config = ConfigDict(populate_by_name=True)


class AutoLeafRequest(BaseModel):
    workspace_alias: str = Field(..., min_length=1, max_length=50)
    geoserver_layer: str = Field(..., min_length=1, max_length=200)
    label: str | None = Field(default=None, max_length=255)

    model_config = ConfigDict(populate_by_name=True)


class LayerBase(CamelCaseInput):
    id: str = Field(..., min_length=1, max_length=100)
    slug: str | None = Field(default=None, max_length=60)
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

    icon_url: str | None = Field(default=None, serialization_alias="iconUrl")

    notice: LayerNotice | None = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @field_validator("slug")
    @classmethod
    def _validate_slug_field(cls, v: str | None) -> str | None:
        return _validate_slug(v)

    @field_validator("icon_url", mode="before")
    @classmethod
    def _store_icon_relative(cls, v):
        return to_relative(v)

    @field_serializer("icon_url", when_used="json-unless-none")
    def _expose_icon_absolute(self, v):
        return to_absolute(v)


class LayerCreate(LayerBase):
    pass


class LayerUpdate(CamelCaseInput):
    slug: str | None = Field(default=None, max_length=60)
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

    icon_url: str | None = Field(default=None, serialization_alias="iconUrl")

    notice: LayerNotice | None = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("slug")
    @classmethod
    def _validate_slug_update(cls, v: str | None) -> str | None:
        return _validate_slug(v)

    @field_validator("icon_url", mode="before")
    @classmethod
    def _store_icon_relative(cls, v):
        return to_relative(v)


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


class LayerAliasResponse(BaseModel):
    alias: str
    layer_id: str = Field(..., serialization_alias="layerId")
    created_by: str | None = Field(default=None, serialization_alias="createdBy")
    created_at: datetime = Field(..., serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LayerAliasCreate(BaseModel):
    alias: str = Field(..., min_length=1, max_length=60)

    @field_validator("alias")
    @classmethod
    def _validate_alias_field(cls, v: str) -> str:
        validated = _validate_slug(v)
        if validated is None:
            raise ValueError("Alias requerido")
        return validated


class SlugSuggestRequest(BaseModel):
    label: str = Field(..., min_length=1)


class SlugSuggestResponse(BaseModel):
    slug: str
    available: bool


class BulkSlugGenerateResult(BaseModel):
    layer_id: str = Field(..., serialization_alias="layerId")
    slug: str
    status: Literal["assigned", "skipped_existing", "collision_resolved"]

    model_config = ConfigDict(populate_by_name=True)


class BulkSlugGenerateResponse(BaseModel):
    total: int
    assigned: int
    skipped: int
    results: list[BulkSlugGenerateResult]
