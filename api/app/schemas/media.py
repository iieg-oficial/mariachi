from pydantic import BaseModel, Field
from app.schemas._camel import CamelCaseInput


class FolderCreate(CamelCaseInput):
    bucket_id: int
    name: str = Field(..., min_length=1, max_length=255)
    parent: str | None = None


class FolderResponse(BaseModel):
    id: str
    bucket_id: int
    name: str
    path: str
    parent: str | None

    model_config = {"from_attributes": True}


class MediaUpdate(CamelCaseInput):
    alt: str | None = None
    description: str | None = None
    folder: str | None = None
