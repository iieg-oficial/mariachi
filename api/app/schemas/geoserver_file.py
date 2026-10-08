from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class GeoServerFileResponse(BaseModel):
    name: str
    content_type: str | None = Field(default=None, serialization_alias="contentType")
    download_url: str = Field(..., serialization_alias="downloadUrl")
    sld_snippet: str = Field(..., serialization_alias="sldSnippet")
    workspace: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class GeoServerFilesListResponse(BaseModel):
    files: list[GeoServerFileResponse]


class GeoServerFolderResponse(BaseModel):
    name: str
    path: str


class GeoServerBrowseResponse(BaseModel):
    path: str
    workspace: str | None = None
    folders: list[GeoServerFolderResponse]
    files: list[GeoServerFileResponse]


class GeoServerSearchResponse(BaseModel):
    query: str
    results: list[GeoServerFileResponse]
    truncated: bool = False


class GeoServerFolderInfoResponse(BaseModel):
    path: str
    workspace: str | None = None
    file_count: int = Field(..., serialization_alias="fileCount")
    folder_count: int = Field(..., serialization_alias="folderCount")

    model_config = ConfigDict(populate_by_name=True)


class GeoServerResourceRef(BaseModel):
    name: str
    workspace: str | None = None
    is_dir: bool = Field(default=False, validation_alias="isDir")

    model_config = ConfigDict(populate_by_name=True)


class GeoServerMoveRequest(BaseModel):
    source: str
    target: str
    workspace: str | None = None
    is_dir: bool = Field(default=False, validation_alias="isDir")

    model_config = ConfigDict(populate_by_name=True)


class GeoServerBulkDeleteRequest(BaseModel):
    items: list[GeoServerResourceRef] = Field(..., min_length=1, max_length=200)


class GeoServerBulkDeleteResponse(BaseModel):
    deleted: int
    failed: int
    errors: list[str] = Field(default_factory=list)


class GeoServerFontFileResponse(BaseModel):
    name: str
    workspace: str | None = None
    download_url: str = Field(..., serialization_alias="downloadUrl")
    loaded: bool = False

    model_config = ConfigDict(populate_by_name=True)


class GeoServerFontFamilyResponse(BaseModel):
    name: str
    source: str = "sistema"

    model_config = ConfigDict(populate_by_name=True)


class GeoServerFontsResponse(BaseModel):
    families: list[GeoServerFontFamilyResponse]
    files: list[GeoServerFontFileResponse]
    pending_reload: bool = Field(default=False, serialization_alias="pendingReload")

    model_config = ConfigDict(populate_by_name=True)
