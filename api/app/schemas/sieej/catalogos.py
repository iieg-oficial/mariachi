from pydantic import BaseModel, ConfigDict, Field


class CatalogoItem(BaseModel):
    id: int
    value: str

    model_config = ConfigDict(from_attributes=True)


class CatalogoCampoRef(BaseModel):
    """Field de un formulario que consume este catálogo."""

    formulario: str
    formulario_id: int
    step_id: str | None = None
    field_name: str | None = None
    field_label: str | None = None


class CatalogoResumen(BaseModel):
    """Un catálogo, cuántas opciones tiene y qué campos lo consumen."""

    clave: str
    label: str
    total: int
    campos: list[CatalogoCampoRef] = []
    sistema: bool = False


class CatalogoAdminItem(BaseModel):
    """Opción de catálogo con el número de envíos que la eligieron."""

    id: int
    value: str
    en_uso: int = 0


class CatalogoItemPayload(BaseModel):
    value: str = Field(min_length=1, max_length=255)


class CatalogoReordenarPayload(BaseModel):
    orden: list[int] = Field(min_length=1)


class CatalogoPayload(BaseModel):
    """Alta/edición de un catálogo; `clave` se deriva del label si falta."""

    label: str = Field(min_length=1, max_length=255)
    clave: str | None = Field(default=None, max_length=64)
