from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas._camel import CamelCaseInput


class MapalabUsuarioCrear(CamelCaseInput):
    correo: EmailStr
    nombre: str | None = Field(default=None, max_length=200)


class MapalabUsuarioActualizar(CamelCaseInput):
    activo: bool | None = None
    nombre: str | None = Field(default=None, max_length=200)


class MapalabUsuarioResponse(BaseModel):
    id: int
    correo: str
    nombre: str | None = None
    activo: bool
    vinculado: bool
    ultimo_acceso: datetime | None = Field(default=None, serialization_alias="ultimoAcceso")
    grupos: list[int] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class MapalabGrupoGuardar(CamelCaseInput):
    nombre: str = Field(..., min_length=1, max_length=120)
    descripcion: str | None = Field(default=None, max_length=300)
    miembros: list[int] = Field(default_factory=list)


class MapalabGrupoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: str | None = None
    miembros: list[int] = Field(default_factory=list)
    capas: int = 0


class MapalabAccesoGuardar(CamelCaseInput):
    privada: bool
    usuarios: list[int] = Field(default_factory=list)
    grupos: list[int] = Field(default_factory=list)


class MapalabAccesoResponse(BaseModel):
    layer_id: str = Field(..., serialization_alias="layerId")
    label: str
    privada: bool
    heredada_de: list[str] = Field(default_factory=list, serialization_alias="heredadaDe")
    usuarios: list[int] = Field(default_factory=list)
    grupos: list[int] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class MapalabCapaPrivadaResponse(BaseModel):
    id: str
    label: str
    node_type: str = Field(..., serialization_alias="nodeType")
    usuarios: int = 0
    grupos: int = 0

    model_config = ConfigDict(populate_by_name=True)
