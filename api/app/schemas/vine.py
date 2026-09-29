from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel


class PanoramaResponse(BaseModel):
    dias: int
    jornada_mediana: float | None = None
    jornadas_huella: int = 0
    personas_huella: int = 0
    jornada_promedio: float | None = None
    jornada_mas_larga: float | None = None
    jornadas_completas: int = 0
    activas_hoy: int = 0
    promedio_diario: float | None = None
    personas_registradas: int = 0
    personas_activas: int = 0
    cobertura: float | None = None


class CalidadResponse(BaseModel):
    persona_dias: int = 0
    completas: int = 0
    sin_salida: int = 0
    sin_entrada: int = 0
    jornadas_descartadas: int = 0
    nunca_registran: int = 0
    personas_incompletas: int = 0
    sin_salida_concentrado: int = 0
    porcentaje_incompletas: float = 0.0
    porcentaje_concentrado: float = 0.0


class SincronizacionResponse(BaseModel):
    eventos: int = 0
    ultimo_id: int | None = None
    ultimo_evento: datetime | None = None
    ultima_sincronizacion: datetime | None = None


class MedioRow(BaseModel):
    medio: str
    personas: int
    dias: int
    sin_salida: int
    cobertura: float | None = None
    jornada_mediana: float | None = None


class VinculoRow(BaseModel):
    vinculo: str
    personas: int
    dias: int
    sin_salida: int
    con_huella: int
    cobertura: float | None = None


class HorarioRow(BaseModel):
    horario: str
    nombre: str
    personas: int
    dias: int
    puntualidad: float | None = None
    entrada_mediana: str | None = None
    salida_mediana: str | None = None
    entrada_oficial: str | None = None
    salida_oficial: str | None = None


class ResumenResponse(BaseModel):
    panorama: PanoramaResponse
    calidad: CalidadResponse
    medios: list[MedioRow]
    vinculos: list[VinculoRow]
    horarios: list[HorarioRow]
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
    entrada_mediana: str | None = None
    salida_mediana: str | None = None


class MesRow(BaseModel):
    mes: str
    asistencias: int
    personas: int
    habiles: int = 0
    inhabiles: int = 0


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
    jornadas: list[dict[str, Any]] = []


class HorasRow(BaseModel):
    pin: str
    nombre: str | None = None
    departamento: str | None = None
    horas_totales: float
    horas_promedio: float
    dias: int
    dias_asistidos: int = 0
    medio: str | None = None
    cobertura: int = 100


class IncompletoRow(BaseModel):
    pin: str
    nombre: str | None = None
    departamento: str | None = None
    dias_asistidos: int
    sin_salida: int
    medio: str | None = None
    porcentaje: int


class MadrugadorRow(BaseModel):
    pin: str
    nombre: str | None = None
    entrada_mediana: str | None = None
    dias: int


class RachaRow(BaseModel):
    pin: str
    nombre: str | None = None
    racha: int


class PersonalRow(BaseModel):
    pin: str
    nombre: str | None = None
    email: str | None = None
    departamento: str | None = None
    vinculo: str | None = None
    medio: str | None = None
    horario: str | None = None
    entrada_habitual: str | None = None
    salida_habitual: str | None = None
    telefono: str | None = None
    extension: str | None = None
    puesto: str | None = None
    foto_url: str | None = None
    cumpleanos: date | None = None
    fecha_ingreso: date | None = None
    alta_sistema: date | None = None
    notas: str | None = None
    editada: bool = False
    baja: bool = False
    dias: int = 0
    medibles: int = 0
    habiles: int = 0
    dias_justificados: int = 0
    asistidos: int = 0
    asistencia: int | None = None
    cobertura: int | None = None
    horas: float | None = None
    primer_dia: date | None = None
    ultimo_dia: date | None = None
    oficial: list[int | None] = []
    recientes: list[dict[str, Any]] = []


class PersonasResponse(BaseModel):
    horas: list[HorasRow]
    madrugadores: list[MadrugadorRow]
    rachas: list[RachaRow]
    incompletos: list[IncompletoRow]


class FichaIn(BaseModel):
    nombre: str | None = None
    apellidos: str | None = None
    email: str | None = None
    telefono: str | None = None
    extension: str | None = None
    departamento: str | None = None
    vinculo: str | None = None
    puesto: str | None = None
    horario: str | None = None
    cumpleanos: date | None = None
    fecha_ingreso: date | None = None
    foto_url: str | None = None
    tarjeta: str | None = None
    activo: bool | None = None
    notas: str | None = None


class FichaDetalle(BaseModel):
    pin: str
    biometrico: dict | None = None
    ficha: dict | None = None


class IncidenciaIn(BaseModel):
    desde: date
    hasta: date
    tipo: str
    nota: str | None = None


class IncidenciaRow(BaseModel):
    id: int
    pin: str
    desde: date
    hasta: date
    dias: int
    tipo: str
    nombre_tipo: str
    efecto: str
    nota: str | None = None
    creado_at: datetime | None = None
    creado_por: str | None = None


class IncidenciaMasivaIn(BaseModel):
    pins: list[str]
    desde: date
    hasta: date
    tipo: str
    nota: str | None = None


class PersonalExportIn(BaseModel):
    formato: Literal["csv", "xlsx"] = "xlsx"
    dias: int = 365
    campos: list[str] | None = None
    pins: list[str] | None = None


class IncidenciaListaRow(IncidenciaRow):
    nombre: str | None = None
    departamento: str | None = None


class CatalogoIn(BaseModel):
    clave: str | None = None
    nombre: str | None = None
    color: str | None = None
    entrada: str | None = None
    salida: str | None = None
    orden: int | None = None
    activo: bool | None = None
    notas: str | None = None


class CatalogoRow(BaseModel):
    id: int
    tipo: str
    clave: str
    nombre: str
    color: str | None = None
    entrada: str | None = None
    salida: str | None = None
    orden: int = 0
    activo: bool = True
    notas: str | None = None
