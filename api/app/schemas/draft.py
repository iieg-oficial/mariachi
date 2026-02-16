from pydantic import BaseModel, Field, ConfigDict


class DraftBase(BaseModel):
    resource_type: str = Field(..., min_length=1, max_length=50)
    data: str = Field(...)


class DraftCreate(DraftBase):
    pass


class DraftResponse(DraftBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)
