from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class GeoServerFileResponse(BaseModel):
    name: str
    content_type: str | None = Field(default=None, serialization_alias="contentType")
    download_url: str = Field(..., serialization_alias="downloadUrl")
    sld_snippet: str = Field(..., serialization_alias="sldSnippet")

    model_config = ConfigDict(populate_by_name=True)


class GeoServerFilesListResponse(BaseModel):
    files: list[GeoServerFileResponse]


class GeoServerFolderResponse(BaseModel):
    name: str
    path: str


class GeoServerBrowseResponse(BaseModel):
    path: str
    folders: list[GeoServerFolderResponse]
    files: list[GeoServerFileResponse]
