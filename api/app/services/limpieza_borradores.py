import json
from typing import Any

from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError

from app.services.publicaciones_capas import _ESQUEMAS, _IGNORADOS


def _vacio(valor: Any) -> bool:
    if valor is None or valor == '':
        return True
    if isinstance(valor, list):
        return all(_vacio(v) for v in valor)
    if isinstance(valor, dict):
        return all(_vacio(v) for v in valor.values())
    return False


def _sin_vacios(valor: Any) -> Any:
    if isinstance(valor, dict):
        return {k: _sin_vacios(v) for k, v in valor.items() if not _vacio(v)}
    if isinstance(valor, list):
        limpios = [_sin_vacios(v) for v in valor if not _vacio(v)]
        return limpios[0] if len(limpios) == 1 else limpios
    return valor


def _norma(valor: Any) -> str | None:
    valor = _sin_vacios(jsonable_encoder(valor))
    if _vacio(valor):
        return None
    if isinstance(valor, (list, dict)):
        return json.dumps(valor, sort_keys=True, ensure_ascii=False)
    return str(valor)


def _publicado(tipo: str, campo: str, valor: Any) -> tuple[str, Any]:
    esquema = _ESQUEMAS.get(tipo)
    if esquema is None:
        return campo, valor
    try:
        datos = esquema.model_validate({campo: valor}).model_dump(exclude_unset=True, by_alias=False)
    except ValidationError:
        return campo, valor
    if len(datos) != 1:
        return campo, valor
    return next(iter(datos.items()))


def campos_sin_cambio(tipo: str, data: dict[str, Any], row: Any) -> list[str]:
    if row is None:
        return []
    iguales = []
    for campo, valor in (data or {}).items():
        if campo in _IGNORADOS:
            continue
        columna, normalizado = _publicado(tipo, campo, valor)
        if not hasattr(row, columna):
            continue
        if _norma(normalizado) == _norma(getattr(row, columna)):
            iguales.append(campo)
    return iguales
