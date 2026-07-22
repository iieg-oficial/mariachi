from datetime import datetime

from pydantic import ConfigDict, Field, field_validator

from app.schemas._camel import CamelCaseInput

SLUG_PATTERN = r"^[a-z0-9-]+$"


class CapaCatalogoBase(CamelCaseInput):
    slug: str = Field(..., min_length=1, max_length=100, pattern=SLUG_PATTERN)
    nombre: str = Field(..., min_length=1, max_length=255)
    workspace_alias: str = Field(
        ..., min_length=1, max_length=100, serialization_alias="workspaceAlias"
    )
    geoserver_layer: str = Field(
        ..., min_length=1, max_length=255, serialization_alias="geoserverLayer"
    )
    search_tags: list[str] | None = Field(default=None, serialization_alias="searchTags")
    enabled: bool = True


class CapaCatalogoCreate(CamelCaseInput):
    slug: str | None = Field(default=None, max_length=100, pattern=SLUG_PATTERN)
    nombre: str | None = Field(default=None, max_length=255)
    workspace_alias: str = Field(
        ..., min_length=1, max_length=100, serialization_alias="workspaceAlias"
    )
    geoserver_layer: str = Field(
        ..., min_length=1, max_length=255, serialization_alias="geoserverLayer"
    )
    search_tags: list[str] | None = Field(default=None, serialization_alias="searchTags")
    enabled: bool = True

    @field_validator("slug", "nombre", mode="before")
    @classmethod
    def _empty_to_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value


class CapaCatalogoUpdate(CamelCaseInput):
    slug: str | None = Field(default=None, min_length=1, max_length=100, pattern=SLUG_PATTERN)
    nombre: str | None = Field(default=None, min_length=1, max_length=255)
    workspace_alias: str | None = Field(
        default=None, min_length=1, max_length=100, serialization_alias="workspaceAlias"
    )
    geoserver_layer: str | None = Field(
        default=None, min_length=1, max_length=255, serialization_alias="geoserverLayer"
    )
    search_tags: list[str] | None = Field(default=None, serialization_alias="searchTags")
    enabled: bool | None = None


class CapaCatalogoResponse(CapaCatalogoBase):
    id: int
    created_at: datetime = Field(..., serialization_alias="createdAt")
    updated_at: datetime = Field(..., serialization_alias="updatedAt")
    updated_by: str | None = Field(default=None, serialization_alias="updatedBy")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CapaCatalogoBulkCreate(CamelCaseInput):
    workspace_alias: str = Field(
        ..., min_length=1, max_length=100, serialization_alias="workspaceAlias"
    )
    geoserver_layers: list[str] = Field(..., serialization_alias="geoserverLayers")
    search_tags: list[str] | None = Field(default=None, serialization_alias="searchTags")


class CapaCatalogoBulkDelete(CamelCaseInput):
    ids: list[int]
