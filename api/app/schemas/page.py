from datetime import datetime

from pydantic import ConfigDict, Field, field_serializer, field_validator

from app.core.acervo_url import to_absolute_in, to_relative_in
from app.schemas._camel import CamelCaseInput


class PageBase(CamelCaseInput):
    title: str = Field(..., min_length=1)
    slug: str = Field(..., min_length=1)
    sections: list[dict] = Field(default_factory=list)
    meta_description: str | None = Field(default=None, serialization_alias="metaDescription")
    meta_keywords: str | None = Field(default=None, serialization_alias="metaKeywords")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("sections", mode="before")
    @classmethod
    def _store_sections_relative(cls, v):
        return to_relative_in(v) if v is not None else v

    @field_serializer("sections", when_used="json")
    def _expose_sections_absolute(self, v):
        return to_absolute_in(v)


class PageCreate(PageBase):
    menu_item_id: str = Field(..., serialization_alias="menuItemId")

    model_config = ConfigDict(populate_by_name=True)


class PageUpdate(CamelCaseInput):
    title: str | None = None
    slug: str | None = None
    sections: list[dict] | None = None
    meta_description: str | None = Field(default=None, serialization_alias="metaDescription")
    meta_keywords: str | None = Field(default=None, serialization_alias="metaKeywords")
    expected_updated_at: datetime | None = Field(default=None, alias="expectedUpdatedAt")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("sections", mode="before")
    @classmethod
    def _store_sections_relative(cls, v):
        return to_relative_in(v) if v is not None else v


class PageResponse(PageBase):
    id: int
    menu_item_id: str = Field(..., serialization_alias="menuItemId")
    published_at: datetime | None = Field(default=None, serialization_alias="publishedAt")
    updated_at: datetime = Field(..., serialization_alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
