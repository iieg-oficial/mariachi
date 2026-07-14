"""Servicio admin de los catalogos SIEEJ.

Los catalogos son tablas globales `{id, value}` que cualquier field `select` o
`select_multiple` puede referenciar via `catalog`. En los envios se guarda el
`value` (no el `id`), asi que:

  - Renombrar propaga el nuevo valor a los envios que ya lo usan, para no
    dejarlos huerfanos.
  - Borrar se bloquea (409) si la opcion esta en uso por algun envio.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models.sieej import (
    CatalogoCalidadDatos,
    CatalogoCategoriaDatos,
    CatalogoEjesEstrategicos,
    CatalogoHerramientasGestion,
    CatalogoObjetivoUso,
    CatalogoPeriodicidad,
    CatalogoUnidadAdmin,
    CatalogoUsuariosDatos,
    EnvioFormulario,
    Formulario,
)

CATALOGOS: dict[str, dict[str, Any]] = {
    "unidades_admin": {
        "model": CatalogoUnidadAdmin,
        "label": "Unidades administrativas",
    },
    "categoria_datos": {
        "model": CatalogoCategoriaDatos,
        "label": "Categoria de datos",
    },
    "herramientas_gestion": {
        "model": CatalogoHerramientasGestion,
        "label": "Herramientas de gestion",
    },
    "calidad_datos": {"model": CatalogoCalidadDatos, "label": "Calidad de datos"},
    "periodicidad": {"model": CatalogoPeriodicidad, "label": "Periodicidad"},
    "objetivo_uso": {"model": CatalogoObjetivoUso, "label": "Objetivo de uso"},
    "usuarios_datos": {
        "model": CatalogoUsuariosDatos,
        "label": "Usuarios de los datos",
    },
    "ejes_estrategicos": {
        "model": CatalogoEjesEstrategicos,
        "label": "Ejes estrategicos",
    },
}


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

    def _config(self, clave: str) -> dict[str, Any]:
        config = CATALOGOS.get(clave)
        if config is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Catalogo `{clave}` no existe.",
            )
        return config

    def _item(self, clave: str, item_id: int) -> Any:
        model = self._config(clave)["model"]
        item = self.db.query(model).filter(model.id == item_id).first()
        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La opcion {item_id} no existe en `{clave}`.",
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

    def listar_catalogos(self) -> list[dict[str, Any]]:
        refs = self._campos_por_catalogo()
        return [
            {
                "clave": clave,
                "label": config["label"],
                "total": self.db.query(config["model"]).count(),
                "campos": refs.get(clave, []),
            }
            for clave, config in CATALOGOS.items()
        ]

    def listar_items(self, clave: str) -> list[dict[str, Any]]:
        model = self._config(clave)["model"]
        conteos = self._conteo_uso(clave)
        return [
            {"id": row.id, "value": row.value, "en_uso": conteos.get(row.value, 0)}
            for row in self.db.query(model).order_by(model.id).all()
        ]

    def crear(self, clave: str, value: str) -> dict[str, Any]:
        model = self._config(clave)["model"]
        value = value.strip()
        if not value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El valor no puede estar vacio.",
            )
        if self.db.query(model).filter(model.value == value).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"La opcion `{value}` ya existe en este catalogo.",
            )
        item = model(value=value)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return {"id": item.id, "value": item.value, "en_uso": 0}

    def renombrar(self, clave: str, item_id: int, value: str) -> dict[str, Any]:
        model = self._config(clave)["model"]
        item = self._item(clave, item_id)
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
            self.db.query(model)
            .filter(model.value == value, model.id != item_id)
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
        item = self._item(clave, item_id)
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
