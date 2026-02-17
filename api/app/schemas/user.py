from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


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

    model_config = {"from_attributes": True}


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
