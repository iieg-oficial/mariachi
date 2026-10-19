from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas._camel import CamelCaseInput


class RolMinerva(BaseModel):
    id: str
    slug: str
    name: str
    description: str | None = None
    delegable: bool = True


class RolDePersona(BaseModel):
    id: str
    slug: str
    name: str
    via: str


class PersonaMinerva(BaseModel):
    minerva_id: str
    email: str
    status: str
    roles: list[RolDePersona] = []
    usuario_id: int | None = None


class EnlaceAcceso(BaseModel):
    url: str
    purpose: str
    expires_at: datetime


class AccesoUpdate(CamelCaseInput):
    role_ids: list[str] = Field(default_factory=list)


class AccesoResponse(BaseModel):
    persona: PersonaMinerva | None = None
    enlace: EnlaceAcceso | None = None
