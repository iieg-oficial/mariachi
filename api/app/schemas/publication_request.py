from datetime import datetime
from pydantic import BaseModel


class PublicationRequestBase(BaseModel):
    resource_type: str


class PublicationRequestCreate(PublicationRequestBase):
    draft_id: int


class PublicationRequestReject(BaseModel):
    reason: str


class PublicationRequestResponse(PublicationRequestBase):
    id: int
    user_id: int
    draft_id: int
    status: str
    rejection_reason: str | None
    reviewed_by: int | None
    created_at: datetime
    reviewed_at: datetime | None
    user_name: str | None = None
    reviewer_name: str | None = None

    class Config:
        from_attributes = True
