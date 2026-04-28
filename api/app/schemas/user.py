from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_serializer,
    field_validator,
)

from app.core.acervo_url import to_absolute, to_relative
from app.schemas.project import BucketSummary, UserProjectAssignment, UserProjectMembership


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
    role: Literal["tetlamamakani", "editora", "externo"]
    project_assignments: list["UserProjectAssignment"] | None = None


class UsuarioUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    email: EmailStr | None = None
    name: str | None = Field(None, min_length=1, max_length=100)
    role: Literal["tetlamamakani", "editora", "externo"] | None = None
    project_assignments: list["UserProjectAssignment"] | None = None


class DependenciaSieejCreate(UsuarioBase):
    pass


class UsuarioResponse(UsuarioBase):
    id: int
    role: str
    must_change_password: bool
    avatar_url: str | None = Field(default=None, serialization_alias='avatarUrl')
    created_at: datetime
    email: LaxEmail
    projects: list["UserProjectMembership"] = []

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator('avatar_url', mode='before')
    @classmethod
    def _store_avatar_relative(cls, v):
        return to_relative(v)

    @field_serializer('avatar_url', when_used='json-unless-none')
    def _expose_avatar_absolute(self, v):
        return to_absolute(v)


class PerfilUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    avatar_url: str | None = Field(default=None, serialization_alias='avatarUrl')

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('avatar_url', mode='before')
    @classmethod
    def _store_avatar_relative(cls, v):
        return to_relative(v)


class CurrentUserResponse(UsuarioResponse):
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


class DependenciaSieejResponse(BaseModel):
    user: UsuarioResponse
    temp_password: str
