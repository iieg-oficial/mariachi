from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas._camel import CamelCaseInput


class ProjectBase(CamelCaseInput):
    slug: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    is_active: bool = True


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(CamelCaseInput):
    name: str | None = Field(default=None, max_length=200)
    description: str | None = None
    is_active: bool | None = None


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProjectAssignment(BaseModel):
    project_slug: str
    project_role: Literal["editor", "viewer"]


class UserProjectMembership(BaseModel):
    slug: str
    name: str
    project_role: Literal["editor", "viewer"]


class BucketSummary(BaseModel):
    id: int
    acervo_bucket: str
    display_name: str
    project_slug: str
    is_public: bool

    model_config = ConfigDict(from_attributes=True)
