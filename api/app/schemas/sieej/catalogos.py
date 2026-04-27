from pydantic import BaseModel, ConfigDict


class CatalogoItem(BaseModel):
    id: int
    value: str

    model_config = ConfigDict(from_attributes=True)


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
