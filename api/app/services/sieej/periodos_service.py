"""Motor de apertura periodica de formularios SIEEJ.

Un formulario con `periodicidad` abre una ventana de captura recurrente
(mensual / trimestral / semestral / anual). Este modulo:

  - calcula la ventana `[apertura, cierre)` de cada periodo (funciones puras,
    testeables sin base de datos),
  - materializa filas `FormularioPeriodo` por adelantado,
  - resuelve el periodo abierto "ahora" (fuente de verdad del gating: el estado
    se computa de la config, no depende de que el cron ya haya corrido),
  - corre `tick()` que abre/cierra ventanas, expira envios en proceso y dispara
    los avisos (apertura -> creador+respondents; faltantes -> creador+admins).

Todas las fechas son naive-UTC (ver `app.core.time`).
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.sieej import EnvioFormulario, Formulario, FormularioPeriodo

# frecuencia -> numero de periodos por año
FRECUENCIAS: dict[str, int] = {
    "mensual": 12,
    "trimestral": 4,
    "semestral": 2,
    "anual": 1,
}
DIA_INICIO_MAX = 28


class PeriodicidadInvalidaError(ValueError):
    """Config de `periodicidad` malformada."""


# ---------------------------------------------------------------------------
# Funciones puras (sin DB)
# ---------------------------------------------------------------------------

def _parse_fecha(valor: Any) -> datetime | None:
    if not isinstance(valor, str):
        return None
    try:
        return datetime.fromisoformat(valor[:10])
    except ValueError:
        return None


def validar_periodicidad(periodicidad: Any) -> dict[str, Any]:
    """Valida y normaliza la config de periodicidad. Lanza
    `PeriodicidadInvalidaError` con mensaje descriptivo."""
    if not isinstance(periodicidad, dict):
        raise PeriodicidadInvalidaError("`periodicidad` debe ser un objeto.")

    frecuencia = periodicidad.get("frecuencia")
    if frecuencia not in FRECUENCIAS:
        raise PeriodicidadInvalidaError(
            f"`frecuencia` debe ser una de {sorted(FRECUENCIAS)}."
        )

    dia_inicio = periodicidad.get("dia_inicio", 1)
    if not isinstance(dia_inicio, int) or not 1 <= dia_inicio <= DIA_INICIO_MAX:
        raise PeriodicidadInvalidaError(
            f"`dia_inicio` debe ser un entero entre 1 y {DIA_INICIO_MAX}."
        )

    duracion = periodicidad.get("duracion_dias", 1)
    if not isinstance(duracion, int) or duracion < 1:
        raise PeriodicidadInvalidaError(
            "`duracion_dias` debe ser un entero >= 1."
        )

    max_dur = _meses_por_periodo(frecuencia) * DIA_INICIO_MAX
    if (dia_inicio - 1) + duracion > max_dur:
        raise PeriodicidadInvalidaError(
            "La ventana (`dia_inicio` + `duracion_dias`) no cabe dentro del "
            "periodo; reduce la duracion o el dia de inicio."
        )

    norm: dict[str, Any] = {
        "frecuencia": frecuencia,
        "dia_inicio": dia_inicio,
        "duracion_dias": duracion,
    }
    ancla = periodicidad.get("ancla")
    if ancla is not None:
        if _parse_fecha(ancla) is None:
            raise PeriodicidadInvalidaError(
                "`ancla` debe ser una fecha ISO (YYYY-MM-DD) valida."
            )
        norm["ancla"] = ancla[:10]
    return norm


def _meses_por_periodo(frecuencia: str) -> int:
    return 12 // FRECUENCIAS[frecuencia]


def _ordinal(frecuencia: str, month: int) -> int:
    return (month - 1) // _meses_por_periodo(frecuencia) + 1


def _start_month(frecuencia: str, ordinal: int) -> int:
    return (ordinal - 1) * _meses_por_periodo(frecuencia) + 1


def clave_de(frecuencia: str, year: int, ordinal: int) -> str:
    if frecuencia == "mensual":
        return f"{year}-{ordinal:02d}"
    if frecuencia == "trimestral":
        return f"{year}-T{ordinal}"
    if frecuencia == "semestral":
        return f"{year}-S{ordinal}"
    return f"{year}"


def _ventana(
    periodicidad: dict[str, Any], year: int, ordinal: int
) -> tuple[str, datetime, datetime]:
    frecuencia = periodicidad["frecuencia"]
    dia = min(max(int(periodicidad.get("dia_inicio", 1)), 1), DIA_INICIO_MAX)
    dur = max(int(periodicidad.get("duracion_dias", 1)), 1)
    apertura = datetime(year, _start_month(frecuencia, ordinal), dia)
    cierre = apertura + timedelta(days=dur)
    return clave_de(frecuencia, year, ordinal), apertura, cierre


def _avanzar(frecuencia: str, year: int, ordinal: int) -> tuple[int, int]:
    if ordinal >= FRECUENCIAS[frecuencia]:
        return year + 1, 1
    return year, ordinal + 1


def _ancla(periodicidad: dict[str, Any]) -> datetime | None:
    return _parse_fecha(periodicidad.get("ancla"))


def periodo_relevante(
    periodicidad: dict[str, Any], ahora: datetime
) -> tuple[str, datetime, datetime]:
    """Ventana vigente o proxima: la actual si sigue abierta o esta por abrir,
    o la siguiente si la actual ya cerro. Respeta `ancla` (nunca antes de ella).
    """
    frecuencia = periodicidad["frecuencia"]
    year, ordinal = ahora.year, _ordinal(frecuencia, ahora.month)
    ancla = _ancla(periodicidad)
    for _ in range(FRECUENCIAS[frecuencia] * 2 + 2):
        clave, apertura, cierre = _ventana(periodicidad, year, ordinal)
        if ahora < cierre and (ancla is None or apertura >= ancla):
            return clave, apertura, cierre
        year, ordinal = _avanzar(frecuencia, year, ordinal)
    return _ventana(periodicidad, year, ordinal)


def ventana_abierta(
    periodicidad: dict[str, Any], ahora: datetime
) -> tuple[str, datetime, datetime] | None:
    """La ventana abierta ahora mismo, o None si el formulario esta cerrado."""
    clave, apertura, cierre = periodo_relevante(periodicidad, ahora)
    if apertura <= ahora < cierre:
        return clave, apertura, cierre
    return None


def proxima_apertura(
    periodicidad: dict[str, Any], ahora: datetime
) -> datetime | None:
    """Fecha de la proxima apertura (para el aviso 'proxima apertura {fecha}').
    None si ya esta abierta ahora."""
    _clave, apertura, cierre = periodo_relevante(periodicidad, ahora)
    if apertura > ahora:
        return apertura
    return None


def _estado_para(apertura: datetime, cierre: datetime, ahora: datetime) -> str:
    if ahora < apertura:
        return "programado"
    if ahora < cierre:
        return "abierto"
    return "cerrado"


# ---------------------------------------------------------------------------
# Servicio (con DB)
# ---------------------------------------------------------------------------

class PeriodosService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_periodo(
        self,
        formulario_id: int,
        clave: str,
        apertura: datetime,
        cierre: datetime,
        ahora: datetime,
    ) -> FormularioPeriodo:
        row = (
            self.db.query(FormularioPeriodo)
            .filter(
                FormularioPeriodo.formulario_id == formulario_id,
                FormularioPeriodo.clave == clave,
            )
            .first()
        )
        if row is not None:
            return row
        row = FormularioPeriodo(
            formulario_id=formulario_id,
            clave=clave,
            apertura=apertura,
            cierre=cierre,
            estado=_estado_para(apertura, cierre, ahora),
        )
        self.db.add(row)
        self.db.flush()
        return row

    def materializar_periodos(
        self, formulario: Formulario, ahora: datetime | None = None
    ) -> list[FormularioPeriodo]:
        """Garantiza que existan las filas del periodo vigente y el siguiente."""
        if not formulario.periodicidad:
            return []
        ahora = ahora or utcnow()
        per = formulario.periodicidad
        frecuencia = per["frecuencia"]
        ancla = _ancla(per)
        creadas: list[FormularioPeriodo] = []
        year, ordinal = ahora.year, _ordinal(frecuencia, ahora.month)
        for _ in range(2):
            clave, apertura, cierre = _ventana(per, year, ordinal)
            if ancla is None or cierre > ancla:
                creadas.append(
                    self.get_or_create_periodo(
                        formulario.id, clave, apertura, cierre, ahora
                    )
                )
            year, ordinal = _avanzar(frecuencia, year, ordinal)
        return creadas

    def resolver_periodo_abierto(
        self, formulario: Formulario, ahora: datetime | None = None
    ) -> FormularioPeriodo | None:
        """El `FormularioPeriodo` abierto ahora (creandolo si falta), o None."""
        if not formulario.periodicidad:
            return None
        ahora = ahora or utcnow()
        ventana = ventana_abierta(formulario.periodicidad, ahora)
        if ventana is None:
            return None
        clave, apertura, cierre = ventana
        return self.get_or_create_periodo(
            formulario.id, clave, apertura, cierre, ahora
        )

    def _expirar_envios_periodo(
        self, periodo: FormularioPeriodo, ahora: datetime
    ) -> int:
        from app.services.sieej.envios_service import _marcar_expirado

        pendientes = (
            self.db.query(EnvioFormulario)
            .filter(
                EnvioFormulario.periodo_id == periodo.id,
                EnvioFormulario.estado == "en_proceso",
            )
            .all()
        )
        for envio in pendientes:
            _marcar_expirado(envio, self.db, ahora)
        return len(pendientes)

    def tick(self, ahora: datetime | None = None) -> dict[str, int]:
        """Materializa, abre, cierra, expira y notifica. Idempotente."""
        ahora = ahora or utcnow()
        formularios = (
            self.db.query(Formulario)
            .filter(
                Formulario.estado == "activo",
                Formulario.periodicidad.isnot(None),
            )
            .all()
        )
        for formulario in formularios:
            self.materializar_periodos(formulario, ahora)
        self.db.flush()

        aperturas = 0
        cierres = 0
        expirados = 0

        por_abrir = (
            self.db.query(FormularioPeriodo)
            .join(Formulario, Formulario.id == FormularioPeriodo.formulario_id)
            .filter(
                Formulario.estado == "activo",
                FormularioPeriodo.apertura <= ahora,
                FormularioPeriodo.cierre > ahora,
            )
            .all()
        )
        for periodo in por_abrir:
            periodo.estado = "abierto"
            if periodo.notificado_apertura_en is None:
                self._notificar(periodo, "apertura")
                periodo.notificado_apertura_en = ahora
                aperturas += 1

        por_cerrar = (
            self.db.query(FormularioPeriodo)
            .filter(
                FormularioPeriodo.cierre <= ahora,
                FormularioPeriodo.estado != "cerrado",
            )
            .all()
        )
        for periodo in por_cerrar:
            era_abierto = periodo.notificado_apertura_en is not None
            periodo.estado = "cerrado"
            expirados += self._expirar_envios_periodo(periodo, ahora)
            if era_abierto and periodo.notificado_faltantes_en is None:
                self._notificar(periodo, "faltantes")
                periodo.notificado_faltantes_en = ahora
                cierres += 1

        self.db.commit()
        return {
            "formularios": len(formularios),
            "aperturas_notificadas": aperturas,
            "cierres_notificados": cierres,
            "envios_expirados": expirados,
        }

    def _notificar(self, periodo: FormularioPeriodo, tipo: str) -> None:
        from app.services.sieej.notificaciones_service import (
            NotificacionesService,
        )

        servicio = NotificacionesService(self.db)
        if tipo == "apertura":
            servicio.notificar_apertura(periodo)
        else:
            servicio.notificar_faltantes(periodo)
