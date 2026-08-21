"""Servicio de envios (CRUD del envio activo + upload de archivos).

Un envio se crea implicitamente la primera vez que el respondent guarda
o consulta el formulario (lazy init), y queda con
`definicion_snapshot` = la definicion vigente del formulario al iniciar.
Cambios futuros del formulario no afectan envios existentes.
"""
from __future__ import annotations

import copy
import json
import logging
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

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
from app.services.sieej import campos_service, field_paths
from app.services.sieej.acervo_keys import (
    construir_object_key,
    construir_respaldo_key,
    valor_archivo,
)
from app.services.sieej.cambio_classifier import diff_definiciones
from app.services.sieej.compat import BUCKET_POR_DEFECTO, normalizar_definicion
from app.services.sieej.datos_validator import DatosInvalidosError, validar_datos
from app.services.sieej.pertenencia import (
    es_coordinador,
    es_miembro,
    resolver_grupo,
)

logger = logging.getLogger(__name__)

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
        return len(pendientes)

    def puede_editar_envio(self, user: Usuario, envio: EnvioFormulario) -> bool:
        """Autorizacion de escritura sobre un envio.

        En los colaborativos manda la membresia del grupo, no `usuario_id`:
        quien sale del grupo pierde el acceso aunque haya iniciado el envio, y
        su autoria sigue en el historial.
        """
        if envio.grupo_id is not None:
            return es_miembro(self.db, user.id, envio.grupo_id)
        return envio.usuario_id == user.id

    def _buscar_envio(
        self,
        formulario: Formulario,
        user: Usuario,
        periodo: FormularioPeriodo | None,
        grupo_id: int | None = None,
    ) -> EnvioFormulario | None:
        """Busca el envio del dueno para el periodo indicado.

        El dueno es el grupo cuando `grupo_id` viene, y el usuario cuando no.
        En formularios periodicos el envio se identifica por
        `(formulario, dueno, periodo)`; si no hay ventana abierta (`periodo`
        None) no existe un envio del periodo actual. En no periodicos es el
        unico envio por `(formulario, dueno)`."""
        query = self.db.query(EnvioFormulario).filter(
            EnvioFormulario.formulario_id == formulario.id,
        )
        if grupo_id is not None:
            query = query.filter(EnvioFormulario.grupo_id == grupo_id)
        else:
            query = query.filter(
                EnvioFormulario.usuario_id == user.id,
                EnvioFormulario.grupo_id.is_(None),
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
        grupo_id: int | None = None,
    ) -> EnvioFormulario | None:
        grupo = resolver_grupo(self.db, formulario, user, grupo_id)
        periodo: FormularioPeriodo | None = None
        if formulario.periodicidad:
            from app.services.sieej.periodos_service import PeriodosService

            periodo = PeriodosService(self.db).resolver_periodo_abierto(
                formulario
            )

        envio = self._buscar_envio(formulario, user, periodo, grupo)
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
                grupo_id=grupo,
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
            # Race: dos requests del mismo dueno llegaron concurrentes y otro
            # gano la insercion. El indice unico parcial
            # (formulario, dueno, periodo) bloqueo este. Devolvemos el ya
            # creado para el mismo periodo. En un colaborativo el otro request
            # puede venir de otro miembro del grupo.
            self.db.rollback()
            existing = self._buscar_envio(formulario, user, periodo, grupo)
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
        self._verificar_escritura_completa(user, envio, enviar=enviar)
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

        datos = self._preservar_archivos_del_servidor(envio, datos)

        payload_bytes = len(json.dumps(datos, default=str).encode("utf-8"))
        if payload_bytes > DATOS_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=(
                    f"`datos` excede el limite de "
                    f"{DATOS_MAX_BYTES // (1024 * 1024)} MB"
                ),
            )

        try:
            validar_datos(envio.definicion_snapshot, datos, estricto=enviar)
        except DatosInvalidosError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"errores": exc.errores},
            ) from exc

        defs = campos_service.field_defs(
            envio.definicion_snapshot or {}, solo_editables=False
        )
        cambios = campos_service.diff_datos(defs, envio.datos or {}, datos)
        envio.datos = datos
        envio.paso_actual = paso_actual
        if cambios:
            envio.datos_version += 1
            campos_service.registrar_historial(
                self.db, envio, cambios, defs, actor=user, origen="captura"
            )
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
        if enviar:
            self.respaldar_envio(envio)
        return envio

    def _verificar_escritura_completa(
        self, user: Usuario, envio: EnvioFormulario, *, enviar: bool
    ) -> None:
        """Cierra el reemplazo total de `datos` en un envio de grupo.

        El PUT manda `datos` completo, asi que un cliente con la copia vieja
        borraria de un golpe lo que el resto del equipo capturo. La captura va
        por el PATCH de campos; el PUT sobrevive solo como el acto de enviar, y
        ese lo hace el coordinador.
        """
        if envio.grupo_id is None:
            return
        if not enviar:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "En un formulario colaborativo la captura va por "
                    "`PATCH /envio/campos`, no por este endpoint"
                ),
            )
        if not es_coordinador(self.db, user.id, envio.grupo_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el coordinador del grupo puede enviar",
            )

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
        if not self.puede_editar_envio(user, envio):
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
        defs = self.editable_field_defs(
            envio.definicion_snapshot or {}, formulario.definicion
        )
        _metas, errores = campos_service.validar_paths(
            defs,
            envio.datos or {},
            campos,
            detalle_no_permitido="campo no editable",
        )
        if errores:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"errores": errores},
            )

        nuevos, cambios = campos_service.aplicar_cambios(envio.datos or {}, campos)
        if not cambios:
            return envio

        payload_bytes = len(json.dumps(nuevos, default=str).encode("utf-8"))
        if payload_bytes > DATOS_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=(
                    f"`datos` excede el limite de "
                    f"{DATOS_MAX_BYTES // (1024 * 1024)} MB"
                ),
            )
        try:
            validar_datos(envio.definicion_snapshot, nuevos, estricto=False)
        except DatosInvalidosError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"errores": exc.errores},
            ) from exc

        envio.datos = nuevos
        flag_modified(envio, "datos")
        envio.datos_version += 1
        campos_service.registrar_historial(
            self.db, envio, cambios, defs, actor=user, origen="correccion"
        )
        envio.actualizado_en = utcnow()
        self._registrar_evento(
            envio,
            "actualizado",
            actor=user,
            payload={"campos": [c[0] for c in cambios], "n": len(cambios)},
        )
        self.db.commit()
        self.db.refresh(envio)
        self.respaldar_envio(envio)
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
        return field_paths.parse_field_path(field_path)

    @staticmethod
    def _marcas_editables(definicion: dict[str, Any] | None) -> dict[str, bool]:
        return campos_service.marcas_editables(definicion)

    @staticmethod
    def editable_field_defs(
        definicion: dict[str, Any],
        vigente: dict[str, Any] | None = None,
    ) -> dict[str, dict[str, Any]]:
        """Campos marcados `editableAfterSubmit` del snapshot del envio.

        `vigente` manda la marca: `editableAfterSubmit` es politica del admin,
        no contrato de datos, y activarla debe alcanzar a los envios ya
        enviados. Un campo que no exista en el snapshot no es editable aunque
        la vigente lo marque. Los `file` entran para que el frontend los ofrezca
        pero no se editan aqui: su valor lo escribe `actualizar_archivo`.
        """
        return campos_service.field_defs(definicion, vigente, solo_editables=True)

    @staticmethod
    def editable_field_paths(
        definicion: dict[str, Any],
        vigente: dict[str, Any] | None = None,
    ) -> dict[str, str]:
        """Mapa `step_id.field_name` -> label de los campos editables tras enviar."""
        return {
            path: meta["label"]
            for path, meta in EnviosService.editable_field_defs(
                definicion, vigente
            ).items()
        }

    @staticmethod
    def snapshot_con_editables_vigentes(
        snapshot: dict[str, Any],
        vigente: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Copia del snapshot con `editableAfterSubmit` tomado de la definicion
        vigente, para que el frontend ofrezca exactamente lo que el backend
        autoriza."""
        if not vigente:
            return snapshot
        marcas = campos_service.marcas_editables(vigente)
        out = copy.deepcopy(snapshot or {})
        for step in out.get("steps", []) or []:
            step_id = step.get("id")
            for field in step.get("fields", []) or []:
                path = f"{step_id}.{field.get('name')}"
                if path in marcas:
                    field["editableAfterSubmit"] = marcas[path]
        return out

    @staticmethod
    def resolver_editable(
        defs: dict[str, dict[str, Any]], field_path: str
    ) -> dict[str, Any] | None:
        return campos_service.resolver(defs, field_path)

    @staticmethod
    def _scope_de_path(
        datos: dict[str, Any], field_path: str, *, crear: bool = False
    ) -> dict[str, Any] | None:
        return field_paths.scope_de_path(datos, field_path, crear=crear)

    @staticmethod
    def _get_valor_en_datos(datos: dict[str, Any], field_path: str) -> Any:
        return field_paths.get_valor_en_datos(datos, field_path)

    @staticmethod
    def _set_valor_en_datos(
        datos: dict[str, Any], field_path: str, valor: Any
    ) -> dict[str, Any]:
        return field_paths.set_valor_en_datos(datos, field_path, valor)

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

        defs = self.editable_field_defs(
            envio.definicion_snapshot or {}, formulario.definicion
        )
        meta = self.resolver_editable(defs, field_path)
        if meta is None or meta["type"] != "file":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
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
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
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
        self.respaldar_envio(envio)
        return archivo

    def _preservar_archivos_del_servidor(
        self, envio: EnvioFormulario, datos: dict[str, Any]
    ) -> dict[str, Any]:
        """Devuelve `datos` con los campos `file` tal como los dejo el upload.

        El valor de un archivo lo escribe el endpoint de subida (es el unico
        que conoce el `object_key` y la URL real); lo que mande el cliente para
        ese campo se ignora. Antes el `Dragger` guardaba la respuesta del
        upload como valor del campo y la reenviaba al guardar, con una forma
        distinta a la del backend: de ahi que en `datos` convivieran
        `filename` y `filename_original`. Ademas, aceptar el valor del cliente
        permitiria apuntar un campo a cualquier URL.

        Un valor vacio si se respeta: es como el respondent quita un archivo.
        """
        definicion = normalizar_definicion(envio.definicion_snapshot or {})
        rutas = [
            (step.get("id"), field.get("name"), step.get("type"))
            for step in definicion.get("steps", []) or []
            for field in step.get("fields", []) or []
            if field.get("type") == "file"
        ]
        if not rutas:
            return datos

        salida = copy.deepcopy(datos)
        previos = envio.datos or {}
        for step_id, name, step_type in rutas:
            if step_type == "repeater":
                items = salida.get(step_id)
                if not isinstance(items, list):
                    continue
                for idx, item in enumerate(items):
                    if isinstance(item, dict):
                        self._restaurar_archivo(item, previos, step_id, name, idx)
            else:
                scope = salida.get(step_id)
                if isinstance(scope, dict):
                    self._restaurar_archivo(scope, previos, step_id, name, None)
        return salida

    @staticmethod
    def _restaurar_archivo(
        scope: dict[str, Any],
        previos: dict[str, Any],
        step_id: str,
        name: str,
        idx: int | None,
    ) -> None:
        if name not in scope or not isinstance(scope.get(name), dict):
            return
        path = f"{step_id}.{name}" if idx is None else f"{step_id}[{idx}].{name}"
        anterior = EnviosService._get_valor_en_datos(previos, path)
        if isinstance(anterior, dict):
            scope[name] = anterior
        else:
            scope.pop(name, None)

    def _periodo_clave(self, envio: EnvioFormulario) -> str | None:
        """Clave del periodo del envio (`2026-01`), o None si no es periodico."""
        if envio.periodo_id is None:
            return None
        periodo = (
            self.db.query(FormularioPeriodo)
            .filter(FormularioPeriodo.id == envio.periodo_id)
            .first()
        )
        return periodo.clave if periodo is not None else None

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
        if not self.puede_editar_envio(user, envio):
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

        bucket = self.bucket_row(bucket_name)
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
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"El archivo excede el limite de {max_mb} MB",
                )

        accept = field_def.get("accept")
        if accept and not self._formato_permitido(ext, file.content_type, accept):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Formato no permitido. Aceptados: {', '.join(accept)}",
            )

        usuario = self.db.query(Usuario).filter(Usuario.id == envio.usuario_id).first()
        object_key = construir_object_key(
            slug=formulario.slug,
            envio_id=envio.id,
            field_path=field_path,
            filename=file.filename,
            usuario=getattr(usuario, "username", None),
            periodo_clave=self._periodo_clave(envio),
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

        archivo_value = valor_archivo(
            field_path=field_path,
            url_publica=url,
            object_key=object_key,
            filename=file.filename or "",
            mime=file.content_type or "application/octet-stream",
            size_bytes=size,
        )
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

    def bucket_row(self, nombre: str) -> AcervoBucket | None:
        """Fila de `acervo_buckets` por nombre de bucket, activa."""
        return (
            self.db.query(AcervoBucket)
            .join(Project, Project.id == AcervoBucket.project_id)
            .filter(
                AcervoBucket.acervo_bucket == nombre,
                AcervoBucket.is_active.is_(True),
            )
            .first()
        )

    def _bucket_de_respaldo(self, definicion: dict[str, Any]) -> AcervoBucket | None:
        """Bucket donde vive el respaldo: el de los campos `file` del
        formulario, o el de SIEEJ por defecto si no tiene ninguno."""
        nombre = BUCKET_POR_DEFECTO
        for step in (definicion or {}).get("steps", []) or []:
            for field in step.get("fields", []) or []:
                if field.get("type") == "file" and field.get("bucket"):
                    nombre = field["bucket"]
                    break
        return self.bucket_row(nombre)

    def respaldar_envio(self, envio: EnvioFormulario) -> str | None:
        """Escribe `envio.json` junto a los archivos del envio.

        Respaldo best-effort **de punta a punta**: cualquier fallo (bucket sin
        configurar, Acervo caido, tabla ausente) se registra y se sigue. Se
        invoca despues del commit y nunca puede tumbar el envio del
        respondent: la fuente de verdad es la BD, esto solo permite
        reconstruir el envio (datos, definicion con la que se lleno y
        archivos) si se pierde.
        """
        try:
            return self._escribir_respaldo(envio)
        except Exception as exc:
            logger.warning(
                "action=sieej.envio.respaldo envio=%s error=%s", envio.id, exc
            )
            self.db.rollback()
            return None

    def _escribir_respaldo(self, envio: EnvioFormulario) -> str | None:
        formulario = (
            self.db.query(Formulario)
            .filter(Formulario.id == envio.formulario_id)
            .first()
        )
        if formulario is None:
            return None
        bucket = self._bucket_de_respaldo(envio.definicion_snapshot or {})
        if bucket is None:
            logger.warning(
                "action=sieej.envio.respaldo envio=%s error=bucket_no_configurado",
                envio.id,
            )
            return None

        usuario = self.db.query(Usuario).filter(Usuario.id == envio.usuario_id).first()
        archivos = (
            self.db.query(EnvioArchivo)
            .filter(EnvioArchivo.envio_id == envio.id)
            .order_by(EnvioArchivo.subido_en)
            .all()
        )
        payload = {
            "generado_en": utcnow().isoformat(),
            "formulario": {
                "id": formulario.id,
                "slug": formulario.slug,
                "nombre": formulario.nombre,
                "version": formulario.version,
            },
            "envio": {
                "id": envio.id,
                "estado": envio.estado,
                "formulario_version": envio.formulario_version,
                "periodo": self._periodo_clave(envio),
                "iniciado_en": envio.iniciado_en,
                "enviado_en": envio.enviado_en,
                "actualizado_en": envio.actualizado_en,
            },
            "usuario": {
                "id": envio.usuario_id,
                "username": getattr(usuario, "username", None),
                "name": getattr(usuario, "name", None),
                "email": getattr(usuario, "email", None),
            },
            "datos": envio.datos or {},
            "definicion_snapshot": envio.definicion_snapshot or {},
            "archivos": [
                {
                    "field_path": a.field_path,
                    "bucket": a.bucket,
                    "object_key": a.object_key,
                    "filename_original": a.filename_original,
                    "mime": a.mime,
                    "size_bytes": a.size_bytes,
                    "subido_en": a.subido_en,
                }
                for a in archivos
            ],
        }
        key = construir_respaldo_key(
            slug=formulario.slug,
            envio_id=envio.id,
            usuario=getattr(usuario, "username", None),
            periodo_clave=self._periodo_clave(envio),
        )
        AcervoClient.for_bucket(bucket).put_bytes(
            key,
            json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8"),
            "application/json",
        )
        return key

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
        if not self.puede_editar_envio(user, envio):
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
    ) -> list[dict[str, Any]]:
        """Historial de cambios de valor de un envio propio (orden cronologico).

        Reutiliza `obtener_mi_envio_detalle` para checar propiedad/404/403. El
        nombre del actor solo sale en envios de grupo: en uno individual el
        unico actor posible es quien pregunta.
        """
        envio = self.obtener_mi_envio_detalle(user, envio_id)
        filas = (
            self.db.query(EnvioValorHistorial, Usuario.name)
            .outerjoin(Usuario, Usuario.id == EnvioValorHistorial.actor_usuario_id)
            .filter(EnvioValorHistorial.envio_id == envio_id)
            .order_by(EnvioValorHistorial.cambiado_en)
            .all()
        )
        de_grupo = envio.grupo_id is not None
        return [
            {
                "field_path": fila.field_path,
                "field_label": fila.field_label,
                "valor_anterior": fila.valor_anterior,
                "valor_nuevo": fila.valor_nuevo,
                "formulario_version": fila.formulario_version,
                "cambiado_en": fila.cambiado_en,
                "origen": fila.origen,
                "actor_nombre": actor_nombre if de_grupo else None,
            }
            for fila, actor_nombre in filas
        ]

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
        if not self.puede_editar_envio(user, envio):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este envio no te pertenece",
            )
        envio.eliminado_en = utcnow()
        self.db.commit()
