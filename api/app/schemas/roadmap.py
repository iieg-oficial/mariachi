from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.roadmap import TIPOS_HITO


class RoadmapHitoBase(BaseModel):
    etiqueta: str
    proyecto: str
    tipo: str
    fecha_eje: str
    fecha_texto: str
    motivo: str
    nombre_anterior: Optional[str] = None
    feature_de: Optional[str] = None
    nace_de: Optional[str] = None
    leyenda: Optional[str] = None
    beta: bool = False
    muerto: bool = False
    orden: int = 0

    @field_validator("tipo")
    @classmethod
    def tipo_conocido(cls, valor: str) -> str:
        if valor not in TIPOS_HITO:
            raise ValueError(f"tipo debe ser uno de {', '.join(TIPOS_HITO)}")
        return valor

    @field_validator("fecha_eje")
    @classmethod
    def fecha_iso(cls, valor: str) -> str:
        try:
            date.fromisoformat(valor)
        except ValueError as error:
            raise ValueError("fecha_eje debe ser YYYY-MM-DD") from error
        return valor


class RoadmapHitoCrear(RoadmapHitoBase):
    clave: str


class RoadmapHitoActualizar(RoadmapHitoBase):
    pass


class RoadmapHitoSalida(RoadmapHitoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clave: str


class RoadmapCicloBase(BaseModel):
    nombre: str
    nota: str = ""
    motivo: str = ""
    color: str
    x0: float
    x1: float
    y0: Optional[float] = None
    y1: Optional[float] = None
    orden: int = 0


class RoadmapCicloCrear(RoadmapCicloBase):
    clave: str


class RoadmapCicloSalida(RoadmapCicloBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clave: str


class RoadmapProcesoBase(BaseModel):
    etiqueta: str
    proyecto: str
    desde: str
    cada: str
    fecha_texto: str
    motivo: str
    activo: bool = True
    orden: int = 0

    @field_validator("desde")
    @classmethod
    def desde_iso(cls, valor: str) -> str:
        try:
            date.fromisoformat(valor)
        except ValueError as error:
            raise ValueError("desde debe ser YYYY-MM-DD") from error
        return valor

    @field_validator("cada")
    @classmethod
    def cada_mes_dia(cls, valor: str) -> str:
        try:
            date.fromisoformat(f"2000-{valor}")
        except ValueError as error:
            raise ValueError("cada debe ser MM-DD") from error
        return valor


class RoadmapProcesoCrear(RoadmapProcesoBase):
    clave: str


class RoadmapProcesoSalida(RoadmapProcesoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clave: str
