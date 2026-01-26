from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class PageBase(BaseModel):
    title: str = Field(..., min_length=1)
    slug: str = Field(..., min_length=1)
    sections: list[dict] = Field(default_factory=list)
    meta_description: str | None = Field(default=None, serialization_alias="metaDescription")
    meta_keywords: str | None = Field(default=None, serialization_alias="metaKeywords")

    model_config = ConfigDict(populate_by_name=True)


class PageCreate(PageBase):
    menu_item_id: str = Field(..., serialization_alias="menuItemId")

    model_config = ConfigDict(populate_by_name=True)


class PageUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    sections: list[dict] | None = None
    meta_description: str | None = Field(default=None, serialization_alias="metaDescription")
    meta_keywords: str | None = Field(default=None, serialization_alias="metaKeywords")

    model_config = ConfigDict(populate_by_name=True)


class PageResponse(PageBase):
    id: int
    menu_item_id: str = Field(..., serialization_alias="menuItemId")
    published_at: datetime | None = Field(default=None, serialization_alias="publishedAt")
    updated_at: datetime = Field(..., serialization_alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
