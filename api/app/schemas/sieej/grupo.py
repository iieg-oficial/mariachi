from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GrupoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=128)
    descripcion: str | None = None


class GrupoCreate(GrupoBase):
    usuarios: list[int] = Field(default_factory=list)


class GrupoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=128)
    descripcion: str | None = None


class GrupoResponse(GrupoBase):
    id: int
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class GrupoUsuariosUpdate(BaseModel):
    usuarios: list[int] = Field(default_factory=list)


class FormularioAsignacionesUpdate(BaseModel):
    grupos: list[int] = Field(default_factory=list)
    usuarios: list[int] = Field(default_factory=list)
