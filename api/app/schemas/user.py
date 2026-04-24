from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, EmailStr, Field

from app.schemas.project import BucketSummary, UserProjectMembership


def _ensure_has_at(v: str) -> str:
    if "@" not in v or not v.split("@", 1)[0] or not v.split("@", 1)[1]:
        raise ValueError("email debe tener la forma local@domain")
    return v


LaxEmail = Annotated[str, AfterValidator(_ensure_has_at)]


class UsuarioBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)


class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=8)
    role: Literal["tetlamamakani", "editora"]


class UsuarioUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    email: EmailStr | None = None
    name: str | None = Field(None, min_length=1, max_length=100)
    role: Literal["tetlamamakani", "editora"] | None = None


class UsuarioResponse(UsuarioBase):
    id: int
    role: str
    must_change_password: bool
    created_at: datetime
    email: LaxEmail

    model_config = {"from_attributes": True}


class CurrentUserResponse(UsuarioResponse):
    projects: list["UserProjectMembership"] = []
    accessible_buckets: list["BucketSummary"] = []


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class PasswordReset(BaseModel):
    new_password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    csrf_token: str
    user: UsuarioResponse


class TokenPayload(BaseModel):
    sub: str
    exp: int
