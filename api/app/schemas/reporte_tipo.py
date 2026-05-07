from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas._camel import CamelCaseInput
from app.schemas.form_schema import FormSchemaDef


class ReporteTipoCreate(CamelCaseInput):
    slug: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-z0-9_]+$")
    label: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="default", max_length=20)
    icon: str | None = Field(default=None, max_length=50)
    descripcion: str | None = None
    form_schema: FormSchemaDef | None = None
    activo: bool = True
    orden: int = 0


class ReporteTipoUpdate(CamelCaseInput):
    label: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=50)
    descripcion: str | None = None
    form_schema: FormSchemaDef | None = None
    activo: bool | None = None
    orden: int | None = None


class ReporteTipoResponse(BaseModel):
    id: int
    slug: str
    label: str
    color: str
    icon: str | None = None
    descripcion: str | None = None
    form_schema: dict | None = Field(default=None, serialization_alias="formSchema")
    activo: bool
    orden: int
    creado_en: datetime = Field(..., serialization_alias="creadoEn")
    actualizado_en: datetime = Field(..., serialization_alias="actualizadoEn")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ReporteTipoReorderItem(CamelCaseInput):
    id: int
    orden: int


class ReporteTipoReorderRequest(CamelCaseInput):
    items: list[ReporteTipoReorderItem]
