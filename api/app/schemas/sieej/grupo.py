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
    """Membresia del grupo y quienes de ella coordinan.

    `coordinadores` es un subconjunto de `usuarios`: quien no aparezca ahi
    queda como capturista. Va como lista y no como mapa de roles porque el rol
    es binario y asi el cliente manda lo que el usuario marco, no un
    diccionario que tenga que armar.
    """

    usuarios: list[int] = Field(default_factory=list)
    coordinadores: list[int] = Field(default_factory=list)


class FormularioAsignacionesUpdate(BaseModel):
    grupos: list[int] = Field(default_factory=list)
    usuarios: list[int] = Field(default_factory=list)
