from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas._camel import CamelCaseInput


class DireccionOrganizacionalCreate(CamelCaseInput):
    nombre: str = Field(..., min_length=1, max_length=200)
    siglas: str | None = Field(default=None, max_length=20)
    descripcion: str | None = None
    email_contacto: EmailStr | None = None
    responsable_nombre: str | None = Field(default=None, max_length=200)
    activo: bool = True
    orden: int = 0


class DireccionOrganizacionalUpdate(CamelCaseInput):
    nombre: str | None = Field(default=None, min_length=1, max_length=200)
    siglas: str | None = Field(default=None, max_length=20)
    descripcion: str | None = None
    email_contacto: EmailStr | None = None
    responsable_nombre: str | None = Field(default=None, max_length=200)
    activo: bool | None = None
    orden: int | None = None


class DireccionOrganizacionalResponse(BaseModel):
    id: int
    nombre: str
    siglas: str | None = None
    descripcion: str | None = None
    email_contacto: str | None = Field(default=None, serialization_alias="emailContacto")
    responsable_nombre: str | None = Field(default=None, serialization_alias="responsableNombre")
    activo: bool
    orden: int
    creado_en: datetime = Field(..., serialization_alias="creadoEn")
    actualizado_en: datetime = Field(..., serialization_alias="actualizadoEn")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DireccionOrganizacionalRef(BaseModel):
    id: int
    nombre: str
    siglas: str | None = None

    model_config = ConfigDict(from_attributes=True)
