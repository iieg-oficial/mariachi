"""Mecanica compartida de escritura por campo sobre `envio.datos`.

Dos flujos escriben campo por campo y comparten todo salvo tres cosas: que
paths se permiten, que estado exige el envio y con que `origen` queda el
historial. La correccion post-envio (`origen='correccion'`) solo toca lo
marcado `editableAfterSubmit` sobre un envio `enviado`; la captura colaborativa
(`origen='captura'`) toca cualquier campo de un envio `en_proceso`.
"""
from __future__ import annotations

import copy
from datetime import timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.core.time import to_naive_utc, utcnow
from app.models.sieej import EnvioFormulario, EnvioValorHistorial
from app.models.user import Usuario
from app.services.sieej.field_paths import (
    get_valor_en_datos,
    parse_field_path,
    scope_de_path,
    set_valor_en_datos,
)

VENTANA_COALESCING = timedelta(minutes=5)
"""Ventana en la que dos ediciones de la misma persona sobre el mismo campo
colapsan en una fila.

Con autosave por campo cada blur puede generar una fila y el historial de un
formulario largo se vuelve ilegible. Solo aplica a `origen='captura'`: la
correccion post-envio es append puro, que es la que tiene valor de auditoria
formal.
"""


def marcas_editables(definicion: dict[str, Any] | None) -> dict[str, bool]:
    """Mapa path base -> `editableAfterSubmit` de una definicion."""
    marcas: dict[str, bool] = {}
    for step in (definicion or {}).get("steps", []) or []:
        step_id = step.get("id")
        for field in step.get("fields", []) or []:
            marcas[f"{step_id}.{field.get('name')}"] = bool(
                field.get("editableAfterSubmit")
            )
    return marcas


def field_defs(
    definicion: dict[str, Any],
    vigente: dict[str, Any] | None = None,
    *,
    solo_editables: bool = True,
) -> dict[str, dict[str, Any]]:
    """Mapa `step_id.field_name` -> `{label, type, repeater, field}`.

    La clave es el path **base** (sin indice); el path real de un repeater lleva
    el indice del item y se resuelve con `resolver`. Se excluye siempre `info`,
    que no captura valor, y los pasos `summary`.

    Con `solo_editables` se queda con lo marcado `editableAfterSubmit`, y la
    marca la manda `vigente` si se pasa: no es parte del contrato de datos sino
    una politica del admin, y activarla debe alcanzar a los envios ya enviados.
    Sin `solo_editables` devuelve todo lo capturable, que es lo que la captura
    colaborativa puede tocar.
    """
    marcas_vigentes = marcas_editables(vigente) if vigente else {}
    defs: dict[str, dict[str, Any]] = {}
    for step in (definicion or {}).get("steps", []) or []:
        step_type = step.get("type")
        if step_type == "summary":
            continue
        step_id = step.get("id")
        for field in step.get("fields", []) or []:
            if field.get("type") == "info":
                continue
            name = field.get("name")
            path = f"{step_id}.{name}"
            if solo_editables and not marcas_vigentes.get(
                path, bool(field.get("editableAfterSubmit"))
            ):
                continue
            defs[path] = {
                "label": field.get("label") or name,
                "type": field.get("type"),
                "repeater": step_type == "repeater",
                "field": field,
            }
    return defs


def resolver(
    defs: dict[str, dict[str, Any]], field_path: str
) -> dict[str, Any] | None:
    """Resuelve un path concreto contra los paths base.

    None si el path no esta en `defs` o su forma no corresponde: un campo de
    repeater exige indice y uno de un paso `form` no lo admite.
    """
    parsed = parse_field_path(field_path)
    if parsed is None:
        return None
    step_id, idx, field_name = parsed
    meta = defs.get(f"{step_id}.{field_name}")
    if meta is None:
        return None
    if meta["repeater"] != (idx is not None):
        return None
    return meta


def validar_paths(
    defs: dict[str, dict[str, Any]],
    datos: dict[str, Any],
    campos: dict[str, Any],
    *,
    detalle_no_permitido: str,
) -> tuple[dict[str, dict[str, Any]], list[dict[str, str]]]:
    """Resuelve cada path del payload contra la definicion.

    Devuelve `(metas, errores)`. Los `file` nunca pasan: su valor lo escribe la
    ruta de upload, que ademas mueve el objeto en el Acervo.
    """
    metas: dict[str, dict[str, Any]] = {}
    errores: list[dict[str, str]] = []
    for field_path in campos:
        meta = resolver(defs, field_path)
        if meta is None:
            errores.append({"field_path": field_path, "error": detalle_no_permitido})
            continue
        if meta["type"] == "file":
            errores.append(
                {
                    "field_path": field_path,
                    "error": (
                        "los archivos se reemplazan con "
                        "`actualizar-archivo`, no con este endpoint"
                    ),
                }
            )
            continue
        if scope_de_path(datos, field_path) is None and meta["repeater"]:
            errores.append(
                {"field_path": field_path, "error": "el elemento no existe"}
            )
            continue
        metas[field_path] = meta
    return metas, errores


def aplicar_cambios(
    datos: dict[str, Any], campos: dict[str, Any]
) -> tuple[dict[str, Any], list[tuple[str, Any, Any]]]:
    """Copia `datos` con los campos aplicados y la lista de lo que cambio."""
    nuevos = copy.deepcopy(datos or {})
    cambios: list[tuple[str, Any, Any]] = []
    for field_path, valor_nuevo in campos.items():
        valor_anterior = get_valor_en_datos(nuevos, field_path)
        if valor_anterior == valor_nuevo:
            continue
        set_valor_en_datos(nuevos, field_path, valor_nuevo)
        cambios.append((field_path, valor_anterior, valor_nuevo))
    return nuevos, cambios


def diff_datos(
    defs: dict[str, dict[str, Any]],
    anteriores: dict[str, Any],
    nuevos: dict[str, Any],
) -> list[tuple[str, Any, Any]]:
    """Campos que cambiaron entre dos versiones completas de `datos`.

    Es lo que permite que un guardado normal —que reemplaza `datos` de golpe—
    alimente el historial de autoria igual que la escritura por campo. En los
    repeaters recorre hasta el mayor de los dos largos, para que dar de alta o
    quitar un item tambien quede registrado.
    """
    cambios: list[tuple[str, Any, Any]] = []
    for base, meta in defs.items():
        parsed = parse_field_path(base)
        if parsed is None:
            continue
        step_id, _, field_name = parsed
        if meta["repeater"]:
            largo = max(
                len(anteriores.get(step_id) or []), len(nuevos.get(step_id) or [])
            )
            paths = [f"{step_id}[{i}].{field_name}" for i in range(largo)]
        else:
            paths = [base]
        for field_path in paths:
            anterior = get_valor_en_datos(anteriores, field_path)
            nuevo = get_valor_en_datos(nuevos, field_path)
            if anterior != nuevo:
                cambios.append((field_path, anterior, nuevo))
    return cambios


def registrar_historial(
    db: Session,
    envio: EnvioFormulario,
    cambios: list[tuple[str, Any, Any]],
    defs: dict[str, dict[str, Any]],
    *,
    actor: Usuario | None,
    origen: str,
) -> None:
    """Escribe una fila por campo cambiado.

    En `captura` colapsa contra la ultima fila del mismo actor y campo si sigue
    dentro de `VENTANA_COALESCING`: conserva su `valor_anterior` —que es el
    valor con que abrio la ventana— y le mueve el valor nuevo, la fecha y la
    version. La version tiene que moverse tambien, o el delta por
    `datos_version` dejaria de ver el cambio.
    """
    ahora = utcnow()
    actor_id = actor.id if actor is not None else None
    for field_path, valor_anterior, valor_nuevo in cambios:
        previa = (
            _fila_coalescible(db, envio, field_path, actor_id, ahora)
            if origen == "captura"
            else None
        )
        if previa is not None:
            previa.valor_nuevo = valor_nuevo
            previa.cambiado_en = ahora
            previa.datos_version = envio.datos_version
            continue
        db.add(
            EnvioValorHistorial(
                envio_id=envio.id,
                field_path=field_path,
                field_label=(resolver(defs, field_path) or {}).get("label"),
                valor_anterior=valor_anterior,
                valor_nuevo=valor_nuevo,
                formulario_version=envio.formulario_version,
                datos_version=envio.datos_version,
                actor_usuario_id=actor_id,
                origen=origen,
            )
        )


def _fila_coalescible(
    db: Session,
    envio: EnvioFormulario,
    field_path: str,
    actor_id: int | None,
    ahora,
) -> EnvioValorHistorial | None:
    if actor_id is None:
        return None
    previa = (
        db.query(EnvioValorHistorial)
        .filter(
            EnvioValorHistorial.envio_id == envio.id,
            EnvioValorHistorial.field_path == field_path,
            EnvioValorHistorial.actor_usuario_id == actor_id,
        )
        .order_by(EnvioValorHistorial.cambiado_en.desc())
        .first()
    )
    if previa is None or previa.origen != "captura":
        return None
    # Postgres devuelve la columna con tzinfo y `utcnow()` es naive; en SQLite
    # las dos salen naive. Normalizar las dos puntas es lo unico que hace que
    # la resta funcione igual en los dos lados.
    desde = to_naive_utc(previa.cambiado_en)
    if desde is None:
        return None
    return previa if to_naive_utc(ahora) - desde < VENTANA_COALESCING else None
