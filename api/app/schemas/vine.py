from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PanoramaResponse(BaseModel):
    dias: int
    jornada_promedio: float | None = None
    jornada_mas_larga: float | None = None
    jornadas_completas: int = 0
    activas_hoy: int = 0
    promedio_diario: float | None = None
    personas_registradas: int = 0
    personas_activas: int = 0


class CalidadResponse(BaseModel):
    persona_dias: int = 0
    completas: int = 0
    sin_salida: int = 0
    sin_entrada: int = 0
    nunca_registran: int = 0
    porcentaje_incompletas: float = 0.0


class SincronizacionResponse(BaseModel):
    eventos: int = 0
    ultimo_id: int | None = None
    ultimo_evento: datetime | None = None
    ultima_sincronizacion: datetime | None = None


class ResumenResponse(BaseModel):
    panorama: PanoramaResponse
    calidad: CalidadResponse
    sincronizacion: SincronizacionResponse


class HoraRow(BaseModel):
    hora: int
    entradas: int
    salidas: int


class DiaSemanaRow(BaseModel):
    dia_semana: int
    nombre: str
    asistencias: int
    personas_promedio: float | None = None


class MesRow(BaseModel):
    mes: str
    asistencias: int
    personas: int


class PuntoRow(BaseModel):
    punto: str
    entradas: int
    salidas: int
    total: int


class RitmoResponse(BaseModel):
    horario: list[HoraRow]
    semanal: list[DiaSemanaRow]
    tendencia: list[MesRow]
    puntos: list[PuntoRow]


class HorasRow(BaseModel):
    pin: str
    nombre: str | None = None
    departamento: str | None = None
    horas_totales: float
    horas_promedio: float
    dias: int


class MadrugadorRow(BaseModel):
    pin: str
    nombre: str | None = None
    entrada_mediana: str | None = None
    dias: int


class RachaRow(BaseModel):
    pin: str
    nombre: str | None = None
    racha: int


class PersonasResponse(BaseModel):
    horas: list[HorasRow]
    madrugadores: list[MadrugadorRow]
    rachas: list[RachaRow]
