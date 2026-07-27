"""Servicio de envios (CRUD del envio activo + upload de archivos).

Un envio se crea implicitamente la primera vez que el respondent guarda
o consulta el formulario (lazy init), y queda con
`definicion_snapshot` = la definicion vigente del formulario al iniciar.
Cambios futuros del formulario no afectan envios existentes.
"""
from __future__ import annotations

import copy
import json
import uuid
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.api.metrics import (
    COUNTER_SIEEJ_ENVIO_EXPIRED,
    COUNTER_SIEEJ_ENVIO_WRITES,
    incr,
)
from app.core.time import to_naive_utc, utcnow
from app.models.acervo_bucket import AcervoBucket
from app.models.project import Project
from app.models.sieej import (
    EnvioArchivo,
    EnvioEvento,
    EnvioFormulario,
    EnvioValorHistorial,
    Formulario,
    FormularioPeriodo,
)
from app.models.user import Usuario
from app.services.acervo import AcervoClient
from app.services.sieej.cambio_classifier import diff_definiciones
from app.services.sieej.compat import normalizar_definicion
from app.services.sieej.datos_validator import DatosInvalidosError, validar_datos

_FORMULARIO_NO_ACEPTA_DETAIL = (
    "El formulario esta cerrado y no acepta cambios"
)

DATOS_MAX_BYTES = 5 * 1024 * 1024
"""Cap de tamano del payload `datos` (JSONB) por envio.

5 MB es generoso para cualquier formulario razonable: 200 fields de texto a
1 KB cada uno = 200 KB. Repeaters con miles de items o textos enormes son
indicio de mal diseno (el respondent deberia subirlos como `file`). El
limite es defensa contra payloads patologicos que llenan disk silenciosamente.
"""


def _marcar_expirado(envio: EnvioFormulario, db: Session, ahora) -> None:
    envio.estado = "expirado"
    envio.expirado_en = ahora
    db.add(
        EnvioEvento(
            envio_id=envio.id,
            tipo="expirado",
            actor_usuario_id=None,
        )
    )


class EnviosService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _formulario_acepta_cambios(formulario: Formulario) -> bool:
        """True si el formulario admite escritura por el respondent."""
        if formulario.estado != "activo":
            return False
        ahora = utcnow()
        if formulario.periodicidad:
            # Formulario periodico: acepta cambios solo dentro de la ventana del
            # periodo abierto. La ventana se computa de la config (no depende de
            # que el cron ya haya materializado/abierto la fila del periodo).
            from app.services.sieej.periodos_service import ventana_abierta

            return ventana_abierta(formulario.periodicidad, ahora) is not None
        vigencia_inicio = to_naive_utc(formulario.vigencia_inicio)
        vigencia_fin = to_naive_utc(formulario.vigencia_fin)
        if vigencia_inicio and vigencia_inicio > ahora:
            return False
        if vigencia_fin and vigencia_fin < ahora:
            return False
        return True

    def _expirar_si_corresponde(
        self,
        envio: EnvioFormulario,
        formulario: Formulario | None = None,
        commit: bool = True,
    ) -> bool:
        """Si el envio en_proceso esta fuera de vigencia, marcarlo expirado.

        Lazy expiration: como el sistema no corre un cron, la transicion
        `en_proceso` -> `expirado` se aplica cuando un endpoint toca el
        envio. Es idempotente y barato (1 query opcional + 1 update).
        Devuelve True si se cambio el estado.
        """
        if envio.estado != "en_proceso":
            return False
        limite = self._limite_expiracion(envio, formulario)
        if limite is None:
            return False
        ahora = utcnow()
        if to_naive_utc(limite) >= ahora:
            return False
        _marcar_expirado(envio, self.db, ahora)
        if commit:
            self.db.commit()
            self.db.refresh(envio)
        return True

    def _limite_expiracion(
        self, envio: EnvioFormulario, formulario: Formulario | None = None
    ):
        """Fecha tras la cual un envio `en_proceso` expira: el `cierre` de su
        periodo (envios periodicos) o la `vigencia_fin` del formulario (envios
        no periodicos). None si no hay limite aplicable."""
        if envio.periodo_id is not None:
            periodo = (
                self.db.query(FormularioPeriodo)
                .filter(FormularioPeriodo.id == envio.periodo_id)
                .first()
            )
            return periodo.cierre if periodo is not None else None
        if formulario is None:
            formulario = (
                self.db.query(Formulario)
                .filter(Formulario.id == envio.formulario_id)
                .first()
            )
        if formulario is None:
            return None
        return formulario.vigencia_fin

    def expirar_pendientes_bulk(self) -> int:
        """Marca como expirado todo `en_proceso` cuyo formulario paso vigencia.

        Para correr desde un endpoint admin de mantenimiento. Devuelve el
        numero de envios afectados.
        """
        ahora = utcnow()
        no_periodicos = (
            self.db.query(EnvioFormulario)
            .join(Formulario, Formulario.id == EnvioFormulario.formulario_id)
            .filter(
                EnvioFormulario.estado == "en_proceso",
                EnvioFormulario.periodo_id.is_(None),
                Formulario.vigencia_fin.isnot(None),
                Formulario.vigencia_fin < ahora,
            )
            .all()
        )
        periodicos = (
            self.db.query(EnvioFormulario)
            .join(
                FormularioPeriodo,
                FormularioPeriodo.id == EnvioFormulario.periodo_id,
            )
            .filter(
                EnvioFormulario.estado == "en_proceso",
                FormularioPeriodo.cierre < ahora,
            )
            .all()
        )
        pendientes = no_periodicos + periodicos
        for envio in pendientes:
            _marcar_expirado(envio, self.db, ahora)
        if pendientes:
            self.db.commit()
            incr(COUNTER_SIEEJ_ENVIO_EXPIRED, len(pendientes))
        return len(pendientes)

    def _buscar_envio(
        self,
        formulario: Formulario,
        user: Usuario,
        periodo: FormularioPeriodo | None,
    ) -> EnvioFormulario | None:
        """Busca el envio del usuario para el periodo indicado.

        En formularios periodicos el envio se identifica por
        `(formulario, usuario, periodo)`; si no hay ventana abierta (`periodo`
        None) no existe un envio del periodo actual. En no periodicos es el
        unico envio por `(formulario, usuario)`."""
        query = self.db.query(EnvioFormulario).filter(
            EnvioFormulario.formulario_id == formulario.id,
            EnvioFormulario.usuario_id == user.id,
        )
        if formulario.periodicidad:
            if periodo is None:
                return None
            query = query.filter(EnvioFormulario.periodo_id == periodo.id)
        return query.first()

    def get_o_iniciar(
        self,
        formulario: Formulario,
        user: Usuario,
        *,
        crear_si_falta: bool = True,
    ) -> EnvioFormulario | None:
        periodo: FormularioPeriodo | None = None
        if formulario.periodicidad:
            from app.services.sieej.periodos_service import PeriodosService

            periodo = PeriodosService(self.db).resolver_periodo_abierto(
                formulario
            )

        envio = self._buscar_envio(formulario, user, periodo)
        if envio is not None:
            return envio
        if not crear_si_falta:
            return None
        if not self._formulario_acepta_cambios(formulario):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_FORMULARIO_NO_ACEPTA_DETAIL,
            )

        try:
            envio = EnvioFormulario(
                formulario_id=formulario.id,
                formulario_version=formulario.version,
                definicion_snapshot=normalizar_definicion(formulario.definicion),
                usuario_id=user.id,
                periodo_id=periodo.id if periodo is not None else None,
                estado="en_proceso",
                datos={},
                paso_actual=0,
            )
            self.db.add(envio)
            self.db.flush()
            self._registrar_evento(envio, "iniciado", actor=user)
            self.db.commit()
            self.db.refresh(envio)
            return envio
        except IntegrityError:
            # Race: dos requests del mismo usuario llegaron concurrentes y otro
            # gano la insercion. El indice unico parcial
            # (formulario, usuario, periodo) bloqueo este. Devolvemos el ya
            # creado para el mismo periodo.
            self.db.rollback()
            existing = self._buscar_envio(formulario, user, periodo)
            if existing is None:
                raise
            return existing

    def actualizar(
        self,
        formulario: Formulario,
        user: Usuario,
        datos: dict[str, Any],
        paso_actual: int,
        *,
        enviar: bool,
        cambios_vistos: list[str] | None = None,
    ) -> EnvioFormulario:
        if not self._formulario_acepta_cambios(formulario):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_FORMULARIO_NO_ACEPTA_DETAIL,
            )
        envio = self.get_o_iniciar(formulario, user)
        if envio.estado == "expirado":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El envio esta expirado y no puede modificarse",
            )
        if envio.estado == "enviado":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El envio ya fue enviado y no puede modificarse",
            )

        payload_bytes = len(json.dumps(datos, default=str).encode("utf-8"))
        if payload_bytes > DATOS_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"`datos` excede el limite de "
                    f"{DATOS_MAX_BYTES // (1024 * 1024)} MB"
                ),
            )

        try:
            validar_datos(envio.definicion_snapshot, datos, estricto=enviar)
        except DatosInvalidosError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"errores": exc.errores},
            ) from exc

        envio.datos = datos
        envio.paso_actual = paso_actual
        if enviar:
            envio.estado = "enviado"
            envio.enviado_en = utcnow()
            envio.cambios_pendientes = None
            self._registrar_evento(envio, "enviado", actor=user)
        else:
            self._descartar_cambios_vistos(envio, cambios_vistos)
            self._registrar_evento(envio, "guardado", actor=user)
        envio.actualizado_en = utcnow()
        self.db.commit()
        self.db.refresh(envio)
        incr(COUNTER_SIEEJ_ENVIO_WRITES)
        return envio

    def actualizar_campos(
        self,
        user: Usuario,
        envio_id: int,
        campos: dict[str, Any],
    ) -> EnvioFormulario:
        """Actualizacion ligera de un envio `enviado`.

        Edita solo los campos marcados `editableAfterSubmit` en el snapshot del
        envio, sin reabrirlo ni cambiar su estado. Cada campo cuyo valor cambie
        genera una fila en `EnvioValorHistorial` (append-only) para el reporte
        de auditoria. El merge sobre `datos` es parcial (no reemplaza el resto).

        Se identifica por `envio_id` (no por formulario+usuario) para no
        ambiguar en formularios periodicos, donde un usuario tiene un envio por
        periodo.
        """
        envio = (
            self.db.query(EnvioFormulario)
            .filter(EnvioFormulario.id == envio_id)
            .with_for_update()
            .first()
        )
        if envio is None or envio.eliminado_en is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Envio no encontrado",
            )
        if envio.usuario_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este envio no te pertenece",
            )
        formulario = (
            self.db.query(Formulario)
            .filter(Formulario.id == envio.formulario_id)
            .first()
        )
        if formulario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Formulario no encontrado",
            )
        if envio.estado != "enviado":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Solo un envio enviado puede actualizarse por campos",
            )
        if not self._formulario_acepta_cambios(formulario):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_FORMULARIO_NO_ACEPTA_DETAIL,
            )
        defs = self.editable_field_defs(envio.definicion_snapshot or {})
        errores: list[dict[str, str]] = []
        metas: dict[str, dict[str, Any]] = {}
        nuevos = copy.deepcopy(envio.datos or {})
        for field_path in campos:
            meta = self.resolver_editable(defs, field_path)
            if meta is None:
                errores.append({"field_path": field_path, "error": "campo no editable"})
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
            if self._scope_de_path(nuevos, field_path) is None and meta["repeater"]:
                errores.append(
                    {"field_path": field_path, "error": "el elemento no existe"}
                )
                continue
            metas[field_path] = meta
        if errores:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"errores": errores},
            )

        cambios: list[tuple[str, Any, Any]] = []
        for field_path, valor_nuevo in campos.items():
            valor_anterior = self._get_valor_en_datos(nuevos, field_path)
            if valor_anterior == valor_nuevo:
                continue
            self._set_valor_en_datos(nuevos, field_path, valor_nuevo)
            cambios.append((field_path, valor_anterior, valor_nuevo))

        if not cambios:
            return envio

        payload_bytes = len(json.dumps(nuevos, default=str).encode("utf-8"))
        if payload_bytes > DATOS_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"`datos` excede el limite de "
                    f"{DATOS_MAX_BYTES // (1024 * 1024)} MB"
                ),
            )
        try:
            validar_datos(envio.definicion_snapshot, nuevos, estricto=False)
        except DatosInvalidosError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"errores": exc.errores},
            ) from exc

        for field_path, valor_anterior, valor_nuevo in cambios:
            self.db.add(
                EnvioValorHistorial(
                    envio_id=envio.id,
                    field_path=field_path,
                    field_label=metas[field_path]["label"],
                    valor_anterior=valor_anterior,
                    valor_nuevo=valor_nuevo,
                    formulario_version=envio.formulario_version,
                    actor_usuario_id=user.id,
                )
            )

        envio.datos = nuevos
        flag_modified(envio, "datos")
        envio.actualizado_en = utcnow()
        self._registrar_evento(
            envio,
            "actualizado",
            actor=user,
            payload={"campos": [c[0] for c in cambios], "n": len(cambios)},
        )
        self.db.commit()
        self.db.refresh(envio)
        incr(COUNTER_SIEEJ_ENVIO_WRITES)
        return envio

    def actualizar_version(
        self, formulario: Formulario, user: Usuario
    ) -> EnvioFormulario:
        """Reescribe el snapshot del envio en proceso a la definicion vigente.

        Conserva `datos` (indexados por nombre de campo) y guarda el diff en
        `cambios_pendientes` para que el frontend marque en el sider/paso/campo
        que cambio. Solo aplica a envios `en_proceso`.
        """
        if not self._formulario_acepta_cambios(formulario):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_FORMULARIO_NO_ACEPTA_DETAIL,
            )
        envio = self.get_o_iniciar(formulario, user, crear_si_falta=False)
        if envio is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tienes un envio de este formulario",
            )
        if envio.estado != "en_proceso":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Solo un envio en proceso puede actualizarse",
            )
        vigente = normalizar_definicion(formulario.definicion or {})
        cambios = diff_definiciones(
            normalizar_definicion(envio.definicion_snapshot or {}), vigente
        )
        envio.definicion_snapshot = vigente
        envio.formulario_version = formulario.version
        envio.cambios_pendientes = cambios or None
        envio.actualizado_en = utcnow()
        self.db.commit()
        self.db.refresh(envio)
        incr(COUNTER_SIEEJ_ENVIO_WRITES)
        return envio

    def reabrir_enviados_por_cambio(
        self, formulario: Formulario, *, actor: Usuario | None = None
    ) -> int:
        """Reabre a `en_proceso` los envios ya `enviado` de version anterior.

        Se invoca cuando el admin publica un cambio que `rompe`: el envio deja
        de ser un registro final y vuelve a pendiente para que el respondent
        reenvie sobre la definicion vigente. Conserva `datos`, reescribe el
        snapshot y guarda el diff en `cambios_pendientes`. No hace commit: el
        caller lo hace dentro de su misma transaccion.
        """
        enviados = (
            self.db.query(EnvioFormulario)
            .filter(
                EnvioFormulario.formulario_id == formulario.id,
                EnvioFormulario.estado == "enviado",
                EnvioFormulario.formulario_version < (formulario.version or 0),
            )
            .all()
        )
        vigente = normalizar_definicion(formulario.definicion or {})
        for envio in enviados:
            cambios = diff_definiciones(
                normalizar_definicion(envio.definicion_snapshot or {}), vigente
            )
            envio.definicion_snapshot = vigente
            envio.formulario_version = formulario.version
            envio.cambios_pendientes = cambios or None
            envio.estado = "en_proceso"
            envio.enviado_en = None
            envio.actualizado_en = utcnow()
            self._registrar_evento(envio, "reabierto", actor=actor)
        return len(enviados)

    @staticmethod
    def info_cambios(
        formulario: Formulario, envio: EnvioFormulario | None
    ) -> dict[str, Any]:
        """Estado de cambios de version del envio para el frontend respondent.

        - `actualizacion_disponible`: hay una version mas nueva que la del
          snapshot (solo pasa tras un cambio que rompe).
        - `cambios_preview`: diff entre lo que el respondent tiene y lo vigente
          (para el banner "ver que cambio").
        - `cambios_aplicados`: distintivos persistidos tras la ultima
          actualizacion (para marcar sider/paso/campo).
        """
        if envio is None:
            return {
                "actualizacion_disponible": False,
                "cambios_preview": [],
                "cambios_aplicados": [],
            }
        disponible = envio.estado == "en_proceso" and (
            (envio.formulario_version or 0) < (formulario.version or 0)
        )
        preview = (
            diff_definiciones(
                normalizar_definicion(envio.definicion_snapshot or {}),
                normalizar_definicion(formulario.definicion or {}),
            )
            if disponible
            else []
        )
        return {
            "actualizacion_disponible": disponible,
            "cambios_preview": preview,
            "cambios_aplicados": envio.cambios_pendientes or [],
        }

    @staticmethod
    def _descartar_cambios_vistos(
        envio: EnvioFormulario, cambios_vistos: list[str] | None
    ) -> None:
        """Quita de `cambios_pendientes` los marcadores que el usuario ya vio.

        Cada marcador se identifica por `step_id.field_name` (o `step_id` para
        marcadores de paso). Al vaciarse, deja la columna en None.
        """
        if not cambios_vistos or not envio.cambios_pendientes:
            return
        vistos = set(cambios_vistos)

        def _key(c: dict[str, Any]) -> str:
            return (
                f"{c.get('step_id')}.{c.get('field_name')}"
                if c.get("field_name")
                else str(c.get("step_id"))
            )

        restantes = [
            c
            for c in envio.cambios_pendientes
            if _key(c) not in vistos and str(c.get("step_id")) not in vistos
        ]
        envio.cambios_pendientes = restantes or None

    @staticmethod
    def _parse_field_path(field_path: str) -> tuple[str, int | None, str] | None:
        """Devuelve (step_id, idx_o_None, field_name) o None si invalido.

        - `general.razon_social` -> ('general', None, 'razon_social')
        - `bases_datos[0].diccionario` -> ('bases_datos', 0, 'diccionario')
        """
        partes = field_path.split(".")
        if len(partes) != 2:
            return None
        step_part, field_name = partes
        if "[" in step_part:
            try:
                step_id, rest = step_part.split("[", 1)
                idx_str = rest.rstrip("]")
                idx = int(idx_str)
            except ValueError:
                return None
            return step_id, idx, field_name
        return step_part, None, field_name

    @staticmethod
    def editable_field_defs(definicion: dict[str, Any]) -> dict[str, dict[str, Any]]:
        """Mapa `step_id.field_name` -> `{label, type, repeater}` de los campos
        marcados `editableAfterSubmit`.

        La clave es el path **base** (sin indice). En un repeater el path real
        lleva el indice del item (`bases_datos[0].diccionario`) y se resuelve
        con `resolver_editable`. Solo se excluye `info`, que no captura valor.

        Los campos `file` entran aqui (para que el frontend los ofrezca y el
        listado sepa que el envio tiene algo actualizable) pero no se editan
        por `actualizar_campos`: su valor lo escribe `actualizar_archivo`.
        """
        editables: dict[str, dict[str, Any]] = {}
        for step in (definicion or {}).get("steps", []) or []:
            step_type = step.get("type")
            if step_type == "summary":
                continue
            step_id = step.get("id")
            for field in step.get("fields", []) or []:
                if field.get("type") == "info":
                    continue
                if not field.get("editableAfterSubmit"):
                    continue
                name = field.get("name")
                editables[f"{step_id}.{name}"] = {
                    "label": field.get("label") or name,
                    "type": field.get("type"),
                    "repeater": step_type == "repeater",
                    "field": field,
                }
        return editables

    @staticmethod
    def editable_field_paths(definicion: dict[str, Any]) -> dict[str, str]:
        """Mapa `step_id.field_name` -> label de los campos editables tras enviar."""
        return {
            path: meta["label"]
            for path, meta in EnviosService.editable_field_defs(definicion).items()
        }

    @staticmethod
    def resolver_editable(
        defs: dict[str, dict[str, Any]], field_path: str
    ) -> dict[str, Any] | None:
        """Resuelve un path concreto contra los paths base editables.

        Devuelve la metadata del campo, o None si el path no es editable o su
        forma no corresponde (un campo de repeater exige indice; uno de un
        paso `form` no lo admite).
        """
        parsed = EnviosService._parse_field_path(field_path)
        if parsed is None:
            return None
        step_id, idx, field_name = parsed
        meta = defs.get(f"{step_id}.{field_name}")
        if meta is None:
            return None
        if meta["repeater"] != (idx is not None):
            return None
        return meta

    @staticmethod
    def _scope_de_path(
        datos: dict[str, Any], field_path: str, *, crear: bool = False
    ) -> dict[str, Any] | None:
        """Devuelve el dict que contiene el campo del path, o None.

        En un repeater es el item del indice, que debe existir: la
        actualizacion ligera corrige respuestas, no da de alta items nuevos.
        """
        parsed = EnviosService._parse_field_path(field_path)
        if parsed is None:
            return None
        step_id, idx, _ = parsed
        if idx is None:
            step_data = (
                datos.setdefault(step_id, {}) if crear else datos.get(step_id)
            )
            return step_data if isinstance(step_data, dict) else None
        step_list = datos.get(step_id)
        if not isinstance(step_list, list) or idx >= len(step_list):
            return None
        item = step_list[idx]
        return item if isinstance(item, dict) else None

    @staticmethod
    def _get_valor_en_datos(datos: dict[str, Any], field_path: str) -> Any:
        """Lee el valor de un path `step.field` o `step[idx].field`."""
        scope = EnviosService._scope_de_path(datos, field_path)
        if scope is None:
            return None
        return scope.get(EnviosService._parse_field_path(field_path)[2])

    @staticmethod
    def _set_valor_en_datos(
        datos: dict[str, Any], field_path: str, valor: Any
    ) -> dict[str, Any]:
        """Escribe el valor de un path `step.field` o `step[idx].field`.

        Crea el dict del step si no existe; en repeaters exige que el item ya
        exista. Devuelve el mismo dict modificado.
        """
        scope = EnviosService._scope_de_path(datos, field_path, crear=True)
        if scope is None:
            return datos
        scope[EnviosService._parse_field_path(field_path)[2]] = valor
        return datos

    @staticmethod
    def _set_archivo_en_datos(
        datos: dict[str, Any],
        field_path: str,
        archivo_value: dict[str, Any],
    ) -> dict[str, Any]:
        """Inserta `archivo_value` en datos[step][field] (o repeater[idx][field]).

        Crea las claves intermedias si no existen. Devuelve el dict modificado
        (mismo objeto). Llamar SIEMPRE despues del upload para mantener el
        contrato `datos[step][field] = {url_publica, ...}` que `validar_datos`
        espera al cierre del envio.
        """
        parsed = EnviosService._parse_field_path(field_path)
        if parsed is None:
            return datos
        step_id, idx, field_name = parsed
        if idx is None:
            step_data = datos.setdefault(step_id, {})
            if not isinstance(step_data, dict):
                return datos
            step_data[field_name] = archivo_value
        else:
            step_list = datos.setdefault(step_id, [])
            if not isinstance(step_list, list):
                return datos
            while len(step_list) <= idx:
                step_list.append({})
            if not isinstance(step_list[idx], dict):
                step_list[idx] = {}
            step_list[idx][field_name] = archivo_value
        return datos

    async def upload_archivo(
        self,
        formulario: Formulario,
        user: Usuario,
        field_path: str,
        file: UploadFile,
    ) -> EnvioArchivo:
        if not self._formulario_acepta_cambios(formulario):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_FORMULARIO_NO_ACEPTA_DETAIL,
            )
        envio = self.get_o_iniciar(formulario, user)
        if envio.estado in {"enviado", "expirado"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El envio no acepta cambios",
            )

        field_def = self._field_para_path(envio.definicion_snapshot, field_path)
        if field_def is None or not field_def.get("bucket"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"field_path '{field_path}' no es un campo `file` valido",
            )

        archivo = await self._subir_archivo_a_acervo(
            formulario, envio, field_def, field_path, file
        )
        envio.actualizado_en = utcnow()
        self.db.commit()
        self.db.refresh(archivo)
        return archivo

    async def actualizar_archivo(
        self,
        user: Usuario,
        envio_id: int,
        field_path: str,
        file: UploadFile,
    ) -> EnvioArchivo:
        """Reemplaza el archivo de un campo `editableAfterSubmit` en un envio
        ya `enviado`, sin reabrirlo.

        Contraparte de `actualizar_campos` para los campos `file`: el valor de
        un archivo no lo escribe el cliente sino la subida a Acervo, asi que va
        por su propio endpoint. Deja la misma huella de auditoria: una fila en
        `EnvioValorHistorial` con el nombre del archivo anterior y el nuevo, y
        un evento `actualizado`. El archivo previo no se borra: su fila en
        `envio_archivo` conserva `object_key` y `url_publica`.
        """
        envio = self._envio_editable_de(user, envio_id)
        formulario = (
            self.db.query(Formulario)
            .filter(Formulario.id == envio.formulario_id)
            .first()
        )
        if formulario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Formulario no encontrado",
            )
        if not self._formulario_acepta_cambios(formulario):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_FORMULARIO_NO_ACEPTA_DETAIL,
            )

        defs = self.editable_field_defs(envio.definicion_snapshot or {})
        meta = self.resolver_editable(defs, field_path)
        if meta is None or meta["type"] != "file":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "errores": [
                        {"field_path": field_path, "error": "campo no editable"}
                    ]
                },
            )
        field_def = meta["field"]
        if not field_def.get("bucket"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"field_path '{field_path}' no es un campo `file` valido",
            )
        if self._scope_de_path(envio.datos or {}, field_path) is None and meta[
            "repeater"
        ]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "errores": [
                        {"field_path": field_path, "error": "el elemento no existe"}
                    ]
                },
            )

        anterior = self._get_valor_en_datos(envio.datos or {}, field_path)
        archivo = await self._subir_archivo_a_acervo(
            formulario, envio, field_def, field_path, file
        )

        self.db.add(
            EnvioValorHistorial(
                envio_id=envio.id,
                field_path=field_path,
                field_label=meta["label"],
                valor_anterior=(
                    anterior.get("filename") if isinstance(anterior, dict) else anterior
                ),
                valor_nuevo=archivo.filename_original,
                formulario_version=envio.formulario_version,
                actor_usuario_id=user.id,
            )
        )
        envio.actualizado_en = utcnow()
        self._registrar_evento(
            envio,
            "actualizado",
            actor=user,
            payload={"campos": [field_path], "n": 1},
        )
        self.db.commit()
        self.db.refresh(archivo)
        incr(COUNTER_SIEEJ_ENVIO_WRITES)
        return archivo

    def _envio_editable_de(self, user: Usuario, envio_id: int) -> EnvioFormulario:
        """Envio `enviado` del usuario, bloqueado para actualizacion ligera."""
        envio = (
            self.db.query(EnvioFormulario)
            .filter(EnvioFormulario.id == envio_id)
            .with_for_update()
            .first()
        )
        if envio is None or envio.eliminado_en is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Envio no encontrado",
            )
        if envio.usuario_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este envio no te pertenece",
            )
        if envio.estado != "enviado":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Solo un envio enviado puede actualizarse por campos",
            )
        return envio

    async def _subir_archivo_a_acervo(
        self,
        formulario: Formulario,
        envio: EnvioFormulario,
        field_def: dict[str, Any],
        field_path: str,
        file: UploadFile,
    ) -> EnvioArchivo:
        """Sube el archivo, registra `EnvioArchivo` y escribe el valor en
        `datos`. No hace commit: lo hace el caller."""
        bucket_name = field_def["bucket"]

        bucket = (
            self.db.query(AcervoBucket)
            .join(Project, Project.id == AcervoBucket.project_id)
            .filter(
                AcervoBucket.acervo_bucket == bucket_name,
                AcervoBucket.is_active.is_(True),
            )
            .first()
        )
        if bucket is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Bucket Acervo '{bucket_name}' no configurado",
            )

        ext = (
            file.filename.rsplit(".", 1)[-1]
            if file.filename and "." in file.filename
            else ""
        )
        size = file.size if getattr(file, "size", None) is not None else None

        max_mb = field_def.get("maxSizeMB")
        if isinstance(max_mb, (int, float)) and max_mb > 0 and size is not None:
            if size > int(max_mb * 1024 * 1024):
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"El archivo excede el limite de {max_mb} MB",
                )

        accept = field_def.get("accept")
        if accept and not self._formato_permitido(ext, file.content_type, accept):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Formato no permitido. Aceptados: {', '.join(accept)}",
            )

        object_key = (
            f"{formulario.slug}/envio{envio.id}/{uuid.uuid4()}.{ext}"
            if ext
            else f"{formulario.slug}/envio{envio.id}/{uuid.uuid4()}"
        )

        client = AcervoClient.for_bucket(bucket)
        url = await client.upload_file(file, object_key)

        if size is None:
            size = 0

        archivo = EnvioArchivo(
            envio_id=envio.id,
            field_path=field_path,
            bucket=bucket_name,
            object_key=object_key,
            url_publica=url,
            filename_original=file.filename or "",
            mime=file.content_type or "application/octet-stream",
            size_bytes=size,
        )
        self.db.add(archivo)

        archivo_value = {
            "url_publica": url,
            "filename": file.filename or "",
            "mime": file.content_type or "application/octet-stream",
            "size_bytes": size,
        }
        datos = copy.deepcopy(envio.datos or {})
        envio.datos = self._set_archivo_en_datos(datos, field_path, archivo_value)
        flag_modified(envio, "datos")
        return archivo

    def _field_para_path(
        self, definicion: dict[str, Any], field_path: str
    ) -> dict[str, Any] | None:
        """Resuelve el campo `file` de un field_path como `step.field` o
        `step[idx].field` (repeater).
        """
        partes = field_path.split(".")
        if len(partes) != 2:
            return None
        step_part, field_name = partes
        step_id = step_part.split("[", 1)[0]
        for step in definicion.get("steps", []):
            if step.get("id") != step_id:
                continue
            for field in step.get("fields", []):
                if field.get("name") == field_name and field.get("type") == "file":
                    return field
        return None

    def _bucket_para_field(
        self, definicion: dict[str, Any], field_path: str
    ) -> str | None:
        field = self._field_para_path(definicion, field_path)
        return field.get("bucket") if field else None

    @staticmethod
    def _formato_permitido(ext: str, mime: str | None, accept: list[str]) -> bool:
        ext_norm = ("." + ext).lower() if ext else ""
        mime_norm = (mime or "").lower()
        for raw in accept:
            a = str(raw).strip().lower()
            if not a:
                continue
            if a.startswith("."):
                if ext_norm == a:
                    return True
            elif a.endswith("/*"):
                if mime_norm.startswith(a[:-1]):
                    return True
            elif "/" in a:
                if mime_norm == a:
                    return True
            elif ext and ext.lower() == a:
                return True
        return False

    def _registrar_evento(
        self,
        envio: EnvioFormulario,
        tipo: str,
        *,
        actor: Usuario | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        evento = EnvioEvento(
            envio_id=envio.id,
            tipo=tipo,
            payload=payload,
            actor_usuario_id=actor.id if actor else None,
        )
        self.db.add(evento)

    # ------------------------------------------------------------------
    # Endpoints respondent: "Mis envios"
    # ------------------------------------------------------------------

    def obtener_mi_envio_detalle(
        self,
        user: Usuario,
        envio_id: int,
    ) -> EnvioFormulario:
        """Detalle de un envio del propio usuario.

        - 404 si no existe.
        - 403 si pertenece a otro usuario (no 404 para no filtrar existencia).
        """
        envio = (
            self.db.query(EnvioFormulario)
            .filter(EnvioFormulario.id == envio_id)
            .first()
        )
        if envio is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Envio no encontrado",
            )
        if envio.usuario_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este envio no te pertenece",
            )
        if envio.eliminado_en is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Envio no encontrado",
            )
        self._expirar_si_corresponde(envio)
        return envio

    def listar_historial_mi_envio(
        self, user: Usuario, envio_id: int
    ) -> list[EnvioValorHistorial]:
        """Historial de cambios de valor de un envio propio (orden cronologico).

        Reutiliza `obtener_mi_envio_detalle` para checar propiedad/404/403.
        """
        self.obtener_mi_envio_detalle(user, envio_id)
        return (
            self.db.query(EnvioValorHistorial)
            .filter(EnvioValorHistorial.envio_id == envio_id)
            .order_by(EnvioValorHistorial.cambiado_en)
            .all()
        )

    def eliminar_mi_envio(self, user: Usuario, envio_id: int) -> None:
        """Soft-delete: marca el envio como eliminado para el respondent.

        - El admin sigue viendo el envio (con `eliminado_en` poblado).
        - El respondent ya no lo ve en `mis-envios` ni en el detalle.
        - Idempotente: re-eliminar un ya eliminado devuelve 404.
        - 403 si el envio no le pertenece (sin filtrar existencia).
        """
        envio = (
            self.db.query(EnvioFormulario)
            .filter(EnvioFormulario.id == envio_id)
            .first()
        )
        if envio is None or envio.eliminado_en is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Envio no encontrado",
            )
        if envio.usuario_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este envio no te pertenece",
            )
        envio.eliminado_en = utcnow()
        self.db.commit()
