from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.services import grid_export
from app.services.vine_perfiles import personal

CAMPOS: tuple[tuple[str, str], ...] = (
    ("pin", "PIN"),
    ("nombre", "Nombre"),
    ("vinculo", "Vínculo"),
    ("baja", "Baja"),
    ("departamento", "Área"),
    ("puesto", "Puesto"),
    ("email", "Correo"),
    ("telefono", "Teléfono"),
    ("extension", "Extensión"),
    ("cumpleanos", "Cumpleaños"),
    ("fecha_ingreso", "Fecha de ingreso"),
    ("alta_sistema", "Alta en el biométrico"),
    ("horario", "Horario"),
    ("medio", "Medio de marcaje"),
    ("entrada_habitual", "Entrada habitual"),
    ("salida_habitual", "Salida habitual"),
    ("dias", "Días con registro"),
    ("asistidos", "Días asistidos"),
    ("habiles", "Días hábiles"),
    ("dias_justificados", "Días justificados"),
    ("asistencia", "Asistencia %"),
    ("cobertura", "Cobertura %"),
    ("horas", "Horas acumuladas"),
    ("primer_dia", "Primer registro"),
    ("ultimo_dia", "Último registro"),
    ("notas", "Notas"),
)

TITULOS = dict(CAMPOS)

POR_OMISION: tuple[str, ...] = (
    "pin",
    "nombre",
    "vinculo",
    "departamento",
    "puesto",
    "email",
    "telefono",
)


def _celda(valor: Any) -> Any:
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return "sí" if valor else "no"
    if isinstance(valor, datetime):
        return valor.strftime("%Y-%m-%d %H:%M")
    if isinstance(valor, date):
        return valor.strftime("%Y-%m-%d")
    return valor


def _validar(campos: list[str] | None) -> list[str]:
    elegidos = [c for c in (campos or []) if c in TITULOS]
    return elegidos or list(POR_OMISION)


def hoja(
    db: Session,
    dias: int,
    campos: list[str] | None,
    pins: list[str] | None,
) -> tuple[list[str], list[list[Any]]]:
    elegidos = _validar(campos)
    filas = personal(db, dias, incluir_bajas=True)

    if pins:
        # El orden lo manda la pantalla: se exporta lo que la persona esta viendo,
        # con su filtro y su busqueda ya aplicados.
        indice = {f["pin"]: f for f in filas}
        filas = [indice[p] for p in pins if p in indice]

    cabeceras = [TITULOS[c] for c in elegidos]
    cuerpo = [[_celda(fila.get(c)) for c in elegidos] for fila in filas]
    return cabeceras, cuerpo


def archivo(
    db: Session,
    formato: str,
    dias: int,
    campos: list[str] | None,
    pins: list[str] | None,
    hoy: date,
) -> tuple[bytes, str, str]:
    cabeceras, cuerpo = hoja(db, dias, campos, pins)
    sello = hoy.strftime("%Y%m%d")

    if formato == "csv":
        return (
            grid_export.to_csv(cabeceras, cuerpo),
            f"vine-personal-{sello}.csv",
            "text/csv; charset=utf-8",
        )

    return (
        grid_export.to_xlsx([("Personal", cabeceras, cuerpo)]),
        f"vine-personal-{sello}.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
