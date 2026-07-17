"""Servicio admin de los catalogos SIEEJ.

Los catalogos son listas globales `{id, value}` que cualquier field
`select` o `select_multiple` puede referenciar via `catalog` usando la
`clave` del catalogo. Viven en el par generico `sieej.catalogo` +
`sieej.catalogo_opcion`, asi que se pueden crear/renombrar/eliminar
desde el admin. En los envios se guarda el `value` (no el `id`):

  - Renombrar una opcion propaga el nuevo valor a los envios que ya lo
    usan, para no dejarlos huerfanos.
  - Borrar una opcion se bloquea (409) si esta en uso por algun envio.
  - Borrar un catalogo se bloquea (409) si algun field lo referencia o
    si alguna de sus opciones esta en uso por algun envio.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models.sieej import (
    Catalogo,
    CatalogoOpcion,
    EnvioFormulario,
    Formulario,
)

CLAVE_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


def _slugify(label: str) -> str:
    normalized = unicodedata.normalize("NFKD", label)
    ascii_label = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "_", ascii_label).strip("_")
    return slug[:64]


def _rutas_catalogo(definicion: dict[str, Any], clave: str) -> list[tuple[str, str, str]]:
    """(step_id, field_name, step_type) de los fields que referencian `clave`."""
    rutas: list[tuple[str, str, str]] = []
    for step in definicion.get("steps") or []:
        step_id = step.get("id")
        step_type = step.get("type")
        if not step_id or step_type == "summary":
            continue
        for field in step.get("fields") or []:
            if field.get("catalog") == clave and field.get("name"):
                rutas.append((step_id, field["name"], step_type))
    return rutas


def _scopes(datos: dict[str, Any], step_id: str, step_type: str) -> list[dict[str, Any]]:
    """Diccionarios donde vive el valor: uno por step, N por repeater."""
    valor = datos.get(step_id)
    if step_type == "repeater":
        if not isinstance(valor, list):
            return []
        return [item for item in valor if isinstance(item, dict)]
    return [valor] if isinstance(valor, dict) else []


def _valores(scope: dict[str, Any], field_name: str) -> list[str]:
    actual = scope.get(field_name)
    if actual is None or actual == "":
        return []
    if isinstance(actual, list):
        return [str(v) for v in actual if v is not None and v != ""]
    return [str(actual)]


def _reemplazar(scope: dict[str, Any], field_name: str, anterior: str, nuevo: str) -> bool:
    actual = scope.get(field_name)
    if isinstance(actual, list):
        if not any(str(v) == anterior for v in actual):
            return False
        scope[field_name] = [nuevo if str(v) == anterior else v for v in actual]
        return True
    if actual is not None and str(actual) == anterior:
        scope[field_name] = nuevo
        return True
    return False


class CatalogosService:
    def __init__(self, db: Session):
        self.db = db

    def _catalogo(self, clave: str) -> Catalogo:
        catalogo = self.db.query(Catalogo).filter(Catalogo.clave == clave).first()
        if catalogo is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Catalogo `{clave}` no existe.",
            )
        return catalogo

    def _item(self, catalogo: Catalogo, item_id: int) -> CatalogoOpcion:
        item = (
            self.db.query(CatalogoOpcion)
            .filter(
                CatalogoOpcion.catalogo_id == catalogo.id,
                CatalogoOpcion.id == item_id,
            )
            .first()
        )
        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La opcion {item_id} no existe en `{catalogo.clave}`.",
            )
        return item

    def _conteo_uso(self, clave: str) -> dict[str, int]:
        """Envios que usan cada `value` del catalogo, segun su propio snapshot."""
        conteos: dict[str, int] = {}
        for envio in self.db.query(EnvioFormulario).all():
            rutas = _rutas_catalogo(envio.definicion_snapshot or {}, clave)
            if not rutas:
                continue
            usados: set[str] = set()
            for step_id, field_name, step_type in rutas:
                for scope in _scopes(envio.datos or {}, step_id, step_type):
                    usados.update(_valores(scope, field_name))
            for value in usados:
                conteos[value] = conteos.get(value, 0) + 1
        return conteos

    def _campos_por_catalogo(self) -> dict[str, list[dict[str, Any]]]:
        """Fields de cualquier formulario que referencian cada catalogo."""
        refs: dict[str, list[dict[str, Any]]] = {}
        for formulario in self.db.query(Formulario).all():
            for step in (formulario.definicion or {}).get("steps") or []:
                for field in step.get("fields") or []:
                    clave = field.get("catalog")
                    if not clave:
                        continue
                    refs.setdefault(clave, []).append({
                        "formulario": formulario.nombre,
                        "formulario_id": formulario.id,
                        "step_id": step.get("id"),
                        "field_name": field.get("name"),
                        "field_label": field.get("label"),
                    })
        return refs

    def _resumen(self, catalogo: Catalogo, campos: list[dict[str, Any]]) -> dict[str, Any]:
        total = (
            self.db.query(CatalogoOpcion)
            .filter(CatalogoOpcion.catalogo_id == catalogo.id)
            .count()
        )
        return {
            "clave": catalogo.clave,
            "label": catalogo.label,
            "total": total,
            "campos": campos,
        }

    def listar_catalogos(self) -> list[dict[str, Any]]:
        refs = self._campos_por_catalogo()
        return [
            self._resumen(catalogo, refs.get(catalogo.clave, []))
            for catalogo in self.db.query(Catalogo).order_by(Catalogo.id.desc()).all()
        ]

    def bundle(self) -> dict[str, list[dict[str, Any]]]:
        """Todos los catalogos como `{clave: [{id, value}, ...]}`."""
        return {
            catalogo.clave: [
                {"id": opcion.id, "value": opcion.value}
                for opcion in catalogo.opciones
            ]
            for catalogo in self.db.query(Catalogo).order_by(Catalogo.id).all()
        }

    def create_catalog(self, label: str, clave: str | None = None) -> dict[str, Any]:
        label = label.strip()
        if not label:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre del catalogo no puede estar vacio.",
            )
        clave = (clave or "").strip() or _slugify(label)
        if not CLAVE_PATTERN.match(clave):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Clave `{clave}` invalida: usa minusculas, numeros y guion "
                    "bajo, empezando con letra."
                ),
            )
        if self.db.query(Catalogo).filter(Catalogo.clave == clave).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un catalogo con la clave `{clave}`.",
            )
        catalogo = Catalogo(clave=clave, label=label)
        self.db.add(catalogo)
        self.db.commit()
        self.db.refresh(catalogo)
        return self._resumen(catalogo, [])

    def update_catalog(self, clave: str, label: str) -> dict[str, Any]:
        catalogo = self._catalogo(clave)
        label = label.strip()
        if not label:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre del catalogo no puede estar vacio.",
            )
        catalogo.label = label
        self.db.commit()
        self.db.refresh(catalogo)
        campos = self._campos_por_catalogo().get(clave, [])
        return self._resumen(catalogo, campos)

    def delete_catalog(self, clave: str) -> None:
        catalogo = self._catalogo(clave)
        campos = self._campos_por_catalogo().get(clave, [])
        if campos:
            formularios = sorted({c["formulario"] for c in campos})
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"No se puede eliminar `{catalogo.label}`: lo usan campos de "
                    f"{', '.join(formularios)}. Desenlaza esos campos primero."
                ),
            )
        en_uso = self._conteo_uso(clave)
        if en_uso:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"No se puede eliminar `{catalogo.label}`: {len(en_uso)} "
                    "opcion(es) estan en uso por envios existentes."
                ),
            )
        self.db.delete(catalogo)
        self.db.commit()

    def listar_items(self, clave: str) -> list[dict[str, Any]]:
        catalogo = self._catalogo(clave)
        conteos = self._conteo_uso(clave)
        return [
            {"id": opcion.id, "value": opcion.value, "en_uso": conteos.get(opcion.value, 0)}
            for opcion in catalogo.opciones
        ]

    def crear(self, clave: str, value: str) -> dict[str, Any]:
        catalogo = self._catalogo(clave)
        value = value.strip()
        if not value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El valor no puede estar vacio.",
            )
        duplicado = (
            self.db.query(CatalogoOpcion)
            .filter(
                CatalogoOpcion.catalogo_id == catalogo.id,
                CatalogoOpcion.value == value,
            )
            .first()
        )
        if duplicado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"La opcion `{value}` ya existe en este catalogo.",
            )
        item = CatalogoOpcion(catalogo_id=catalogo.id, value=value)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return {"id": item.id, "value": item.value, "en_uso": 0}

    def renombrar(self, clave: str, item_id: int, value: str) -> dict[str, Any]:
        catalogo = self._catalogo(clave)
        item = self._item(catalogo, item_id)
        value = value.strip()
        if not value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El valor no puede estar vacio.",
            )

        anterior = item.value
        if anterior == value:
            return {
                "id": item.id,
                "value": item.value,
                "en_uso": self._conteo_uso(clave).get(item.value, 0),
            }

        duplicado = (
            self.db.query(CatalogoOpcion)
            .filter(
                CatalogoOpcion.catalogo_id == catalogo.id,
                CatalogoOpcion.value == value,
                CatalogoOpcion.id != item_id,
            )
            .first()
        )
        if duplicado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"La opcion `{value}` ya existe en este catalogo.",
            )

        item.value = value
        envios_actualizados = self._propagar(clave, anterior, value)
        self.db.commit()
        self.db.refresh(item)
        return {"id": item.id, "value": item.value, "en_uso": envios_actualizados}

    def _propagar(self, clave: str, anterior: str, nuevo: str) -> int:
        """Reescribe `anterior` -> `nuevo` en los envios que lo usan."""
        actualizados = 0
        for envio in self.db.query(EnvioFormulario).all():
            rutas = _rutas_catalogo(envio.definicion_snapshot or {}, clave)
            if not rutas:
                continue
            datos = envio.datos or {}
            cambiado = False
            for step_id, field_name, step_type in rutas:
                for scope in _scopes(datos, step_id, step_type):
                    if _reemplazar(scope, field_name, anterior, nuevo):
                        cambiado = True
            if cambiado:
                envio.datos = datos
                flag_modified(envio, "datos")
                actualizados += 1
        return actualizados

    def eliminar(self, clave: str, item_id: int) -> None:
        catalogo = self._catalogo(clave)
        item = self._item(catalogo, item_id)
        en_uso = self._conteo_uso(clave).get(item.value, 0)
        if en_uso:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"No se puede borrar `{item.value}`: la eligieron en {en_uso} "
                    "envio(s). Renombrala si necesitas corregirla."
                ),
            )
        self.db.delete(item)
        self.db.commit()
