from datetime import datetime

from pydantic import BaseModel, Field


class FontUpload(BaseModel):
    """Schema para subir una fuente"""
    name: str = Field(..., min_length=1, max_length=255, description="Nombre descriptivo (ej: 'Montserrat Bold')")
    family: str = Field(..., min_length=1, max_length=255, description="Font-family CSS (ej: 'Montserrat')")
    style: str = Field(default="normal", description="normal | italic | oblique")
    weight: int = Field(default=400, ge=100, le=900, description="Peso de la fuente (100-900)")


class FontResponse(BaseModel):
    """Schema para respuestas de fuentes"""
    id: str
    name: str
    family: str
    style: str
    weight: int
    format: str
    url: str
    file_size: int
    uploaded_by: str
    uploaded_by_name: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class FontListItem(BaseModel):
    """Schema simplificado para listar fuentes"""
    id: str
    name: str
    family: str
    style: str
    weight: int
    format: str
    url: str

    model_config = {"from_attributes": True}


class FontFamily(BaseModel):
    """Schema para agrupar fuentes por familia"""
    family: str
    variants: list[FontListItem]
