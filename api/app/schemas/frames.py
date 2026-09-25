from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.services.frames_config import enmascarar_rtsp

NOMBRE_PATRON = r"^[a-z][a-z0-9_]*$"


class CamaraBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=20, pattern=NOMBRE_PATRON)
    etiqueta: str = Field(min_length=2, max_length=200)
    ubicacion: str | None = None
    rtsp_url: str = Field(min_length=8)
    habilitada: bool = True
    grabacion_habilitada: bool = True
    retencion_dias: int = Field(default=7, ge=1, le=365)
    deteccion_habilitada: bool = False
    orden: int = 0

    @field_validator("rtsp_url")
    @classmethod
    def validar_rtsp(cls, valor: str) -> str:
        if not valor.startswith("rtsp://"):
            raise ValueError("La URL debe empezar con rtsp://")
        return valor


class CamaraCreate(CamaraBase):
    pass


class CamaraUpdate(BaseModel):
    etiqueta: str | None = Field(default=None, min_length=2, max_length=200)
    ubicacion: str | None = None
    rtsp_url: str | None = None
    habilitada: bool | None = None
    grabacion_habilitada: bool | None = None
    retencion_dias: int | None = Field(default=None, ge=1, le=365)
    deteccion_habilitada: bool | None = None
    orden: int | None = None

    @field_validator("rtsp_url")
    @classmethod
    def validar_rtsp(cls, valor: str | None) -> str | None:
        if valor is not None and not valor.startswith("rtsp://"):
            raise ValueError("La URL debe empezar con rtsp://")
        return valor


class CamaraResponse(CamaraBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @field_serializer("rtsp_url")
    def ocultar_credenciales(self, valor: str) -> str | None:
        return enmascarar_rtsp(valor)


class EstadoResponse(BaseModel):
    disponible: bool
    version: str | None = None
    detalle: str | None = None
    camaras_en_frames: list[str] = []
    camaras_en_mariachi: int = 0
    sincronizado: bool = False


class PreviewResponse(BaseModel):
    configuracion: str
    valido: bool
    detalle: str | None = None


class AplicarResponse(BaseModel):
    aplicado: bool
    reiniciado: bool
    detalle: str | None = None
