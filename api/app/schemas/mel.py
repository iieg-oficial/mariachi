from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class MarcaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    nombre: str
    descripcion: str | None = None
    activa: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    grupo: str
    clave: str
    tipo: str
    valor: Any
    descripcion: str | None = None
    orden: int


class TokenUpdate(BaseModel):
    valor: Any = None
    descripcion: str | None = None


class FuenteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    familia: str
    formato: str
    base_url: str | None = None
    faces: list[dict[str, Any]]


class ContrasteResponse(BaseModel):
    frente: str
    fondo: str
    descripcion: str
    ratio: float
    cumple_aa: bool
    cumple_aa_texto_grande: bool


class MarcaDetalle(BaseModel):
    marca: MarcaResponse
    tokens: list[TokenResponse]
    campos: dict[str, str]
    fuentes: list[FuenteResponse]
    contraste: list[ContrasteResponse]


class CamposUpdate(BaseModel):
    valores: dict[str, str]
