from __future__ import annotations

from collections.abc import Iterable
from datetime import date, timedelta

from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.orm import Session

from app.models.mapalab_api_key import MapalabApiKey
from app.models.mapalab_api_key_rendimiento import (
    MapalabApiKeyRendimientoDiario,
    MapalabApiKeySitioDiario,
)
from app.models.mapalab_api_key_uso import MapalabApiKeyUsoDiario
from app.schemas.mapalab_api_key_telemetria import (
    MapalabApiKeyRendimientoItem,
    MapalabApiKeySitioItem,
)

_INSERTS = {"postgresql": postgresql.insert, "sqlite": sqlite.insert}

METRICAS_SUMABLES = ("muestras", "suma", "buenas", "regulares", "malas")
SITIOS_SUMABLES = ("cargas", "listos", "errores_js", "denegados", "timeouts")
TABLAS_DIARIAS = (
    MapalabApiKeyUsoDiario,
    MapalabApiKeyRendimientoDiario,
    MapalabApiKeySitioDiario,
)


class _LlavesExistentes:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._vistas: dict[int, bool] = {}

    def existe(self, key_id: int) -> bool:
        if key_id not in self._vistas:
            fila = self._db.query(MapalabApiKey.id).filter(MapalabApiKey.id == key_id).first()
            self._vistas[key_id] = fila is not None
        return self._vistas[key_id]


def _parse_dia(valor: str) -> date | None:
    try:
        return date.fromisoformat(valor)
    except (TypeError, ValueError):
        return None


def _upsert_sumando(
    db: Session,
    modelo: type,
    llaves: dict[str, object],
    sumables: dict[str, int | float],
) -> None:
    insert = _INSERTS.get(db.get_bind().dialect.name, postgresql.insert)
    stmt = insert(modelo).values(**llaves, **sumables)
    stmt = stmt.on_conflict_do_update(
        index_elements=list(llaves.keys()),
        set_={campo: getattr(modelo, campo) + valor for campo, valor in sumables.items()},
    )
    db.execute(stmt)


def registrar_rendimiento(db: Session, items: Iterable[MapalabApiKeyRendimientoItem]) -> int:
    llaves = _LlavesExistentes(db)
    upserts = 0
    for item in items:
        dia = _parse_dia(item.dia)
        if dia is None or not llaves.existe(item.key_id):
            continue
        _upsert_sumando(
            db,
            MapalabApiKeyRendimientoDiario,
            {
                "api_key_id": item.key_id,
                "dia": dia,
                "origen": (item.origen or "")[:255],
                "metrica": item.metrica[:20],
            },
            {campo: getattr(item, campo) for campo in METRICAS_SUMABLES},
        )
        upserts += 1
    db.commit()
    return upserts


def registrar_sitios(db: Session, items: Iterable[MapalabApiKeySitioItem]) -> int:
    llaves = _LlavesExistentes(db)
    upserts = 0
    for item in items:
        dia = _parse_dia(item.dia)
        if dia is None or not llaves.existe(item.key_id):
            continue
        _upsert_sumando(
            db,
            MapalabApiKeySitioDiario,
            {"api_key_id": item.key_id, "dia": dia, "origen": (item.origen or "")[:255]},
            {campo: getattr(item, campo) for campo in SITIOS_SUMABLES},
        )
        upserts += 1
    db.commit()
    return upserts


def purgar_diarios(db: Session, hoy: date, retencion_dias: int) -> dict[str, int]:
    corte = hoy - timedelta(days=retencion_dias)
    borrados: dict[str, int] = {}
    for modelo in TABLAS_DIARIAS:
        borrados[modelo.__tablename__] = (
            db.query(modelo).filter(modelo.dia < corte).delete(synchronize_session=False)
        )
    db.commit()
    return borrados
