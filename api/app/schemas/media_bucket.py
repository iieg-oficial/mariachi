from datetime import datetime

from pydantic import ConfigDict, Field

from app.schemas._camel import CamelCaseInput


class MediaBucketBase(CamelCaseInput):
    project_id: int
    acervo_bucket: str = Field(min_length=1, max_length=100)
    access_key_ref: str = Field(min_length=1, max_length=100)
    display_name: str = Field(min_length=1, max_length=200)
    is_public: bool = False
    is_active: bool = True


class MediaBucketCreate(MediaBucketBase):
    pass


class MediaBucketUpdate(CamelCaseInput):
    display_name: str | None = Field(default=None, max_length=200)
    is_public: bool | None = None
    is_active: bool | None = None


class MediaBucketResponse(MediaBucketBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
