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


class CatalogoAdminItem(BaseModel):
    """Opción de catálogo con el número de envíos que la eligieron."""

    id: int
    value: str
    en_uso: int = 0


class CatalogoItemPayload(BaseModel):
    value: str = Field(min_length=1, max_length=255)


class CatalogosResponse(BaseModel):
    """Bundle con todos los catálogos SIEEJ; reduce roundtrips desde el wizard."""

    unidades_admin: list[CatalogoItem]
    categoria_datos: list[CatalogoItem]
    herramientas_gestion: list[CatalogoItem]
    calidad_datos: list[CatalogoItem]
    periodicidad: list[CatalogoItem]
    objetivo_uso: list[CatalogoItem]
    usuarios_datos: list[CatalogoItem]
    ejes_estrategicos: list[CatalogoItem]
