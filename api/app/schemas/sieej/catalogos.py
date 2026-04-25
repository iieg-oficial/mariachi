from typing import List

from pydantic import BaseModel, ConfigDict


class CatalogoItem(BaseModel):
    id: int
    value: str

    model_config = ConfigDict(from_attributes=True)


class CatalogosResponse(BaseModel):
    """Bundle con todos los catálogos SIEEJ; reduce roundtrips desde el wizard."""

    unidades_admin: List[CatalogoItem]
    categoria_datos: List[CatalogoItem]
    herramientas_gestion: List[CatalogoItem]
    calidad_datos: List[CatalogoItem]
    periodicidad: List[CatalogoItem]
    objetivo_uso: List[CatalogoItem]
    usuarios_datos: List[CatalogoItem]
    ejes_estrategicos: List[CatalogoItem]
