from pydantic import ConfigDict, Field

from app.schemas._camel import CamelCaseInput


class MenuItemBase(CamelCaseInput):
    label: str = Field(..., min_length=1)
    url: str = Field(..., min_length=1)
    order: int = Field(default=0)
    visible: bool = Field(default=True)
    disabled: bool = Field(default=False)
    external: bool = Field(default=False)
    parent_id: int | None = Field(default=None, serialization_alias="parentId")
    icon: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(CamelCaseInput):
    label: str | None = None
    url: str | None = None
    order: int | None = None
    visible: bool | None = None
    disabled: bool | None = None
    external: bool | None = None
    parent_id: int | None = Field(default=None, serialization_alias="parentId")
    icon: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class MenuItemResponse(MenuItemBase):
    id: int

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MenuItemTree(MenuItemResponse):
    children: list["MenuItemTree"] = Field(default_factory=list)
