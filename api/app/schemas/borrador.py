from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UsuarioBorradorInfo(BaseModel):
    id: int
    name: str
    username: str

    model_config = ConfigDict(from_attributes=True)


class BorradorUpsert(BaseModel):
    data: dict


class RechazarIn(BaseModel):
    comentario: str | None = None


class BorradorResponse(BaseModel):
    id: int
    resource_type: str
    resource_id: str
    data: dict
    estado: str
    comentario_rechazo: str | None
    actualizado_en: datetime
    usuario: UsuarioBorradorInfo | None = None

    model_config = ConfigDict(from_attributes=True)
