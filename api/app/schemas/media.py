from pydantic import BaseModel, Field


class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent: str | None = None


class FolderResponse(BaseModel):
    id: str
    name: str
    path: str
    parent: str | None

    model_config = {"from_attributes": True}
