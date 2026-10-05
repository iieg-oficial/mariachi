import re
from typing import Literal, Self

from pydantic import Field, field_validator, model_validator

from app.schemas._camel import CamelCaseInput

Animacion = Literal['pelota', 'aguilas']
ModoEvento = Literal['completo', 'lite']
FormaTramos = Literal['ninguno', 'solido', 'mitades', 'tercios']

FONDOS_PALETA = ('blanco', 'morado-suave', 'morado', 'naranja', 'grafito')
TRAMOS_POR_FORMA = {'ninguno': 0, 'solido': 1, 'mitades': 2, 'tercios': 3}
AVISO_MAX_LENGTH = 80
DESTINO_ZOOM_MIN = 5
DESTINO_ZOOM_MAX = 19
DESTINO_ZOOM_DEFAULT = 15
DESTINO_RUTA_MAX = 4

_HEX_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')


class _Tramos(CamelCaseInput):
    forma: FormaTramos = 'ninguno'
    colores: list[str] = Field(default_factory=list, max_length=3)

    @model_validator(mode='after')
    def _validate_cantidad(self) -> Self:
        esperados = TRAMOS_POR_FORMA[self.forma]
        if len(self.colores) != esperados:
            raise ValueError(f'La forma «{self.forma}» lleva {esperados} color(es) y llegaron {len(self.colores)}')
        return self


class FondoBoton(_Tramos):
    @field_validator('colores')
    @classmethod
    def _validate_paleta(cls, colores: list[str]) -> list[str]:
        fuera = [c for c in colores if c not in FONDOS_PALETA]
        if fuera:
            raise ValueError(f'Fondo fuera de la paleta institucional: {", ".join(fuera)}')
        return colores


class BordeBoton(_Tramos):
    @field_validator('colores')
    @classmethod
    def _validate_hex(cls, colores: list[str]) -> list[str]:
        invalidos = [c for c in colores if not _HEX_RE.match(c)]
        if invalidos:
            raise ValueError(f'Colores de borde inválidos, se espera #RRGGBB: {", ".join(invalidos)}')
        return [c.upper() for c in colores]


class BotonEstilo(CamelCaseInput):
    fondo: FondoBoton = Field(default_factory=FondoBoton)
    borde: BordeBoton = Field(default_factory=BordeBoton)


class DiversionMixin:
    @field_validator('modo', 'animacion', mode='before', check_fields=False)
    @classmethod
    def _rechazar_nulo(cls, valor: object) -> object:
        if valor is None:
            raise ValueError('No puede quedar vacío')
        return valor

    @field_validator('aviso_inicial', mode='before', check_fields=False)
    @classmethod
    def _limpiar_aviso(cls, valor: object) -> object:
        if isinstance(valor, str):
            return valor.strip() or None
        return valor


class PuntoRuta(CamelCaseInput):
    lon: float = Field(ge=-180, le=180)
    lat: float = Field(ge=-90, le=90)


class DestinoDato(CamelCaseInput):
    lon: float = Field(ge=-180, le=180)
    lat: float = Field(ge=-90, le=90)
    zoom: int = Field(default=DESTINO_ZOOM_DEFAULT, ge=DESTINO_ZOOM_MIN, le=DESTINO_ZOOM_MAX)
    ruta: list[PuntoRuta] | None = Field(default=None, max_length=DESTINO_RUTA_MAX)

    @field_validator('ruta', mode='before')
    @classmethod
    def _sin_ruta_vacia(cls, valor: object) -> object:
        if isinstance(valor, list) and not valor:
            return None
        return valor
