from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UsuarioBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)


class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=8)
    role: Literal["tetlamamakani", "editora", "diseñadora"]


class UsuarioUpdate(BaseModel):
    email: EmailStr | None = None
    name: str | None = Field(None, min_length=1, max_length=100)
    role: Literal["tetlamamakani", "editora", "diseñadora"] | None = None


class UsuarioResponse(UsuarioBase):
    id: int
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    csrf_token: str
    user: UsuarioResponse


class TokenPayload(BaseModel):
    sub: str
    exp: int
