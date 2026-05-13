from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas._camel import CamelCaseInput


SymbolKind = Literal["emoji", "svg", "image"]


class SymbolCategoryBase(CamelCaseInput):
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    name: str = Field(..., min_length=1, max_length=200)
    icon: str | None = None
    sort_order: int = Field(default=0, serialization_alias="sortOrder")


class SymbolCategoryCreate(SymbolCategoryBase):
    pass


class SymbolCategoryUpdate(CamelCaseInput):
    slug: str | None = Field(default=None, min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    name: str | None = Field(default=None, min_length=1, max_length=200)
    icon: str | None = None
    sort_order: int | None = Field(default=None, serialization_alias="sortOrder")


class SymbolCategoryResponse(BaseModel):
    id: int
    slug: str
    name: str
    icon: str | None = None
    sort_order: int = Field(..., serialization_alias="sortOrder")
    created_at: datetime = Field(..., serialization_alias="createdAt")
    updated_at: datetime = Field(..., serialization_alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class SymbolBase(CamelCaseInput):
    kind: SymbolKind
    value: str | None = None
    name: str | None = Field(default=None, max_length=200)
    sort_order: int = Field(default=0, serialization_alias="sortOrder")


class SymbolCreate(SymbolBase):
    category_id: int = Field(..., serialization_alias="categoryId")

    @model_validator(mode="after")
    def _validate_payload_by_kind(self) -> "SymbolCreate":
        if self.kind == "emoji":
            if not self.value or not self.value.strip():
                raise ValueError("kind=emoji requiere `value` con el caracter Unicode")
        elif self.kind == "svg":
            if not self.value or "<svg" not in self.value.lower():
                raise ValueError("kind=svg requiere `value` con el XML del SVG")
        elif self.kind == "image":
            if self.value:
                raise ValueError(
                    "kind=image no debe enviar `value`; el archivo se sube por el endpoint multipart"
                )
        return self


class SymbolUpdate(CamelCaseInput):
    category_id: int | None = Field(default=None, serialization_alias="categoryId")
    name: str | None = Field(default=None, max_length=200)
    value: str | None = None
    sort_order: int | None = Field(default=None, serialization_alias="sortOrder")


class SymbolResponse(BaseModel):
    id: int
    category_id: int = Field(..., serialization_alias="categoryId")
    kind: SymbolKind
    value: str | None = None
    name: str | None = None
    sort_order: int = Field(..., serialization_alias="sortOrder")
    image_url: str | None = Field(default=None, serialization_alias="imageUrl")
    png_url: str | None = Field(default=None, serialization_alias="pngUrl")
    created_at: datetime = Field(..., serialization_alias="createdAt")
    updated_at: datetime = Field(..., serialization_alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class SymbolCatalogCategory(BaseModel):
    id: int
    slug: str
    name: str
    icon: str | None = None
    symbols: list[SymbolResponse]

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class SymbolCatalogResponse(BaseModel):
    categories: list[SymbolCatalogCategory]


class SymbolReorderItem(CamelCaseInput):
    id: int
    sort_order: int = Field(..., serialization_alias="sortOrder")


class SymbolReorderRequest(BaseModel):
    items: list[SymbolReorderItem]
