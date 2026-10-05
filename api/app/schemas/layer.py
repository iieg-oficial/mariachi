from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.core.acervo_url import to_absolute, to_relative
from app.schemas._camel import CamelCaseInput

NodeType = Literal["tema", "category", "label", "group", "leaf"]

SLUG_PATTERN = r"^[a-z0-9-]+$"

HIGHLIGHT_COLOR_PRESETS = {"morado", "naranja", "sombreado"}
HEX_COLOR_PATTERN = r"^#[0-9A-Fa-f]{6}$"
HighlightColor = str
HighlightShape = Literal["area", "linea", "off"]
GeometryType = Literal["point", "line", "polygon", "raster"]


def _validate_highlight_color(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    import re
    if value in HIGHLIGHT_COLOR_PRESETS:
        return value
    if re.match(HEX_COLOR_PATTERN, value):
        return value.upper() if value.startswith("#") else value
    raise ValueError(
        f"highlight_color invalido: '{value}'. Use uno de {sorted(HIGHLIGHT_COLOR_PRESETS)} o un hex #RRGGBB."
    )

NoticeVariant = Literal["info", "warning", "neutral", "banner"]
NoticeSize = Literal["compact", "small", "medium", "large"]
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


BadgeVariant = Literal["new", "updated", "soon", "custom"]


class LayerBadge(CamelCaseInput):
    enabled: bool = False
    variant: BadgeVariant = "new"
    label: str | None = Field(default=None, max_length=40)
    color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    valid_from: str | None = Field(default=None, serialization_alias="validFrom")
    valid_until: str | None = Field(default=None, serialization_alias="validUntil")

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

    @field_validator("color", mode="before")
    @classmethod
    def _empty_color_to_none(cls, v):
        return None if v in (None, "") else v


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


def _normalize_label_for_compare(value: str) -> str:
    return value.strip().lower().replace('_', '').replace('-', '').replace(' ', '')


class AutoLeafRequest(BaseModel):
    workspace_alias: str = Field(..., min_length=1, max_length=50)
    geoserver_layer: str = Field(..., min_length=1, max_length=200)
    label: str = Field(..., min_length=1, max_length=255)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('label')
    @classmethod
    def _label_not_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError('El nombre de la capa no puede estar vacio')
        return stripped

    @field_validator('label')
    @classmethod
    def _label_distinct_from_slug(cls, value: str, info) -> str:
        gs_layer = info.data.get('geoserver_layer')
        if gs_layer and _normalize_label_for_compare(value) == _normalize_label_for_compare(gs_layer):
            raise ValueError(
                'El nombre de la capa debe ser distinto al identificador GeoServer'
            )
        return value


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
    tiled: bool = Field(default=True)
    image_format: str = Field(default="image/png", max_length=32, serialization_alias="imageFormat")
    antialias: str = Field(default="text", max_length=8)

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
    municipio_field_type: str | None = Field(default=None, max_length=20, serialization_alias="municipioFieldType")
    direccion_field: str | None = Field(default=None, max_length=100, serialization_alias="direccionField")

    infobox_template: str | None = Field(default=None, max_length=50, serialization_alias="infoboxTemplate")
    infobox_params: dict | None = Field(default=None, serialization_alias="infoboxParams")
    infobox_config: dict | None = Field(default=None, serialization_alias="infoboxConfig")

    icon_url: str | None = Field(default=None, serialization_alias="iconUrl")
    icon_overrides: dict | None = Field(default=None, serialization_alias="iconOverrides")

    notice: LayerNotice | None = None
    badge: LayerBadge | None = None
    highlight_color: HighlightColor | None = Field(default=None, serialization_alias="highlightColor")
    highlight_shape: HighlightShape | None = Field(default=None, serialization_alias="highlightShape")
    geometry_type: GeometryType | None = Field(default=None, serialization_alias="geometryType")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @field_validator("slug")
    @classmethod
    def _validate_slug_field(cls, v: str | None) -> str | None:
        return _validate_slug(v)

    @field_validator("highlight_color", mode="before")
    @classmethod
    def _validate_highlight_color_base(cls, v):
        return _validate_highlight_color(v)

    @field_validator("icon_url", mode="before")
    @classmethod
    def _store_icon_relative(cls, v):
        return to_relative(v)

    @field_validator("icon_overrides", mode="before")
    @classmethod
    def _store_icon_overrides_relative(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return {k: to_relative(val) for k, val in v.items()}
        return v

    @field_serializer("icon_url", when_used="json-unless-none")
    def _expose_icon_absolute(self, v):
        return to_absolute(v)

    @field_serializer("icon_overrides", when_used="json-unless-none")
    def _expose_icon_overrides_absolute(self, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return {k: to_absolute(val) for k, val in v.items()}
        return v


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
    tiled: bool | None = Field(default=None)
    image_format: str | None = Field(default=None, serialization_alias="imageFormat")
    antialias: str | None = Field(default=None)

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
    municipio_field_type: str | None = Field(default=None, max_length=20, serialization_alias="municipioFieldType")
    direccion_field: str | None = Field(default=None, serialization_alias="direccionField")

    infobox_template: str | None = Field(default=None, serialization_alias="infoboxTemplate")
    infobox_params: dict | None = Field(default=None, serialization_alias="infoboxParams")
    infobox_config: dict | None = Field(default=None, serialization_alias="infoboxConfig")

    icon_url: str | None = Field(default=None, serialization_alias="iconUrl")
    icon_overrides: dict | None = Field(default=None, serialization_alias="iconOverrides")

    notice: LayerNotice | None = None
    badge: LayerBadge | None = None
    highlight_color: HighlightColor | None = Field(default=None, serialization_alias="highlightColor")
    highlight_shape: HighlightShape | None = Field(default=None, serialization_alias="highlightShape")
    geometry_type: GeometryType | None = Field(default=None, serialization_alias="geometryType")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("highlight_color", mode="before")
    @classmethod
    def _validate_highlight_color_update(cls, v):
        return _validate_highlight_color(v)

    @field_validator("slug")
    @classmethod
    def _validate_slug_update(cls, v: str | None) -> str | None:
        return _validate_slug(v)

    @field_validator("icon_url", mode="before")
    @classmethod
    def _store_icon_relative(cls, v):
        return to_relative(v)

    @field_validator("icon_overrides", mode="before")
    @classmethod
    def _store_icon_overrides_relative(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return {k: to_relative(val) for k, val in v.items()}
        return v


class LayerResponse(LayerBase):
    privada: bool = False
    created_at: datetime = Field(..., serialization_alias="createdAt")
    updated_at: datetime = Field(..., serialization_alias="updatedAt")
    updated_by: str | None = Field(default=None, serialization_alias="updatedBy")
    deleted_at: datetime | None = Field(default=None, serialization_alias="deletedAt")
    deleted_by: str | None = Field(default=None, serialization_alias="deletedBy")


class DeletedLayerSummary(BaseModel):
    id: str
    label: str
    node_type: str = Field(..., serialization_alias="nodeType")
    parent_id: str | None = Field(default=None, serialization_alias="parentId")
    deleted_at: datetime = Field(..., serialization_alias="deletedAt")
    deleted_by: str | None = Field(default=None, serialization_alias="deletedBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LayerReferencesResponse(BaseModel):
    children_count: int = Field(..., serialization_alias="childrenCount")
    in_initial_order: bool = Field(..., serialization_alias="inInitialOrder")
    eventos: list[dict] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class LayerTreeNode(LayerBase):
    privada: bool = False
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


class HighlightStats(BaseModel):
    total_leaves: int = Field(..., serialization_alias="totalLeaves")
    by_color: dict[str, int] = Field(default_factory=dict, serialization_alias="byColor")
    by_shape: dict[str, int] = Field(default_factory=dict, serialization_alias="byShape")
    fully_default: int = Field(..., serialization_alias="fullyDefault")
    with_color_override: int = Field(..., serialization_alias="withColorOverride")
    with_shape_override: int = Field(..., serialization_alias="withShapeOverride")
    with_custom_hex: int = Field(..., serialization_alias="withCustomHex")

    model_config = ConfigDict(populate_by_name=True)


class HighlightBulkApplyBody(CamelCaseInput):
    color: HighlightColor | None = None
    shape: HighlightShape | None = None
    apply_to: Literal["all", "defaults"] = Field(..., serialization_alias="applyTo")
    theme_ids: list[str] | None = Field(default=None, serialization_alias="themeIds")
    dry_run: bool = Field(default=False, serialization_alias="dryRun")

    @field_validator("color", mode="before")
    @classmethod
    def _validate_color(cls, v):
        return _validate_highlight_color(v)


class HighlightBulkSnapshot(CamelCaseInput):
    layer_id: str = Field(..., serialization_alias="layerId")
    color: str | None = None
    shape: str | None = None


class HighlightBulkApplyResult(BaseModel):
    affected: int
    snapshot: list[HighlightBulkSnapshot]

    model_config = ConfigDict(populate_by_name=True)


class HighlightBulkRestoreBody(CamelCaseInput):
    snapshot: list[HighlightBulkSnapshot]


class HighlightResetBody(CamelCaseInput):
    theme_ids: list[str] | None = Field(default=None, serialization_alias="themeIds")
    dry_run: bool = Field(default=False, serialization_alias="dryRun")
