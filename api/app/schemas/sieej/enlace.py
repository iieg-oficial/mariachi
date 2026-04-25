from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class EnlaceBase(BaseModel):
    nombres: str
    apellido1: str
    apellido2: str
    direccion: str
    puesto: str
    email: str
    extension: Optional[str] = Field(default=None)
    telefono: str
    es_tecnico: bool

    nombres_jefe: str
    apellido1_jefe: str
    apellido2_jefe: str
    puesto_jefe: str
    email_jefe: str


class EnlaceCreate(EnlaceBase):
    pass


class EnlaceUpdate(EnlaceBase):
    pass


class EnlaceResponse(EnlaceBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
