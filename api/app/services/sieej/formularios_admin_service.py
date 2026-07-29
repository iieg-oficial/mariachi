"""Servicio admin de formularios.

CRUD + publicar/cerrar + asignaciones + listado de envios. Bump de
version cuando un formulario con envios cambia su definicion.
"""
from __future__ import annotations

import logging
from datetime import UTC
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.api.metrics import (
    COUNTER_SIEEJ_ENVIO_REABIERTO,
    COUNTER_SIEEJ_FORMULARIO_WRITES,
    incr,
)
from app.core.time import utcnow
from app.models.sieej import (
    EnvioEvento,
    EnvioFormulario,
    EnvioValorHistorial,
    Formulario,
    FormularioVersion,
    Grupo,
    formulario_grupo,
    formulario_usuario,
)
from app.models.user import Usuario
from app.services.actividad_service import registrar_actividad
from app.services.sieej.cambio_classifier import clasificar_cambio
from app.services.sieej.compat import normalizar_definicion
from app.services.sieej.definicion_validator import (
    DefinicionInvalidaError,
    validar_definicion,
)
from app.services.sieej.envios_service import EnviosService

logger = logging.getLogger(__name__)

SLUGS_RESERVADOS = {
    "inicio-sesion",
    "exencion",
    "cambiar-contrasena",
    "error",
    "catalogos",
    "schema",
    "envio",
    "mis-envios",
}


class FormulariosAdminService:
    def __init__(self, db: Session):
        self.db = db

    def listar(
        self,
        *,
        estado: str | None = None,
        slug: str | None = None,
    ) -> list[Formulario]:
        q = self.db.query(Formulario).options(
            selectinload(Formulario.grupos),
            selectinload(Formulario.usuarios_asignados),
        )
        if estado is not None:
            q = q.filter(Formulario.estado == estado)
        if slug is not None:
            q = q.filter(Formulario.slug.ilike(f"%{slug}%"))
        return q.order_by(Formulario.creado_en.desc()).all()

    def get(self, formulario_id: int) -> Formulario:
        f = self.db.query(Formulario).filter(Formulario.id == formulario_id).first()
        if f is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Formulario no encontrado",
            )
        return f

    def get_by_slug(self, slug: str) -> Formulario:
        f = self.db.query(Formulario).filter(Formulario.slug == slug).first()
        if f is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Formulario no encontrado",
            )
        return f

    def get_by_id_or_slug(self, id_or_slug: str) -> Formulario:
        if id_or_slug.isdigit():
            return self.get(int(id_or_slug))
        return self.get_by_slug(id_or_slug)

    @staticmethod
    def _normalizar_periodicidad(valor: Any) -> dict[str, Any] | None:
        """Valida y normaliza la config de periodicidad; None si no aplica."""
        if valor is None:
            return None
        from app.services.sieej.periodos_service import (
            PeriodicidadInvalidaError,
            validar_periodicidad,
        )

        try:
            return validar_periodicidad(valor)
        except PeriodicidadInvalidaError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

    @staticmethod
    def _verificar_conflicto(f: Formulario, esperado: Any) -> None:
        """Rechaza el guardado si otra persona escribio despues de que el
        editor cargo el formulario. La tolerancia de un segundo evita falsos
        positivos por clientes que truncan el ISO a milisegundos; dos personas
        distintas guardando el mismo formulario dentro del mismo segundo no es
        un escenario real.
        """
        if esperado is None or f.actualizado_en is None:
            return
        actual = f.actualizado_en
        if actual.tzinfo is None:
            actual = actual.replace(tzinfo=UTC)
        if esperado.tzinfo is None:
            esperado = esperado.replace(tzinfo=UTC)
        if abs((actual - esperado).total_seconds()) <= 1:
            return
        autor = getattr(f.actualizado_por, "name", None)
        detalle = (
            f"Otra persona guardo cambios en este formulario"
            f"{f' ({autor})' if autor else ''} el "
            f"{actual.strftime('%d/%m/%Y a las %H:%M')}. "
            "Recarga para ver la version vigente antes de guardar la tuya."
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detalle)

    def crear(self, data: dict[str, Any], creador: Usuario) -> Formulario:
        data["definicion"] = normalizar_definicion(data["definicion"])
        try:
            validar_definicion(data["definicion"])
        except DefinicionInvalidaError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

        if data["slug"] in SLUGS_RESERVADOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El slug '{data['slug']}' esta reservado por el sistema",
            )

        if self.db.query(Formulario).filter(Formulario.slug == data["slug"]).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un formulario con slug '{data['slug']}'",
            )

        f = Formulario(
            slug=data["slug"],
            nombre=data["nombre"],
            descripcion=data.get("descripcion"),
            definicion=data["definicion"],
            vigencia_inicio=data.get("vigencia_inicio"),
            vigencia_fin=data.get("vigencia_fin"),
            periodicidad=self._normalizar_periodicidad(data.get("periodicidad")),
            publico=data.get("publico", False),
            estado="borrador",
            version=1,
            creado_por_id=creador.id,
        )
        self.db.add(f)
        self.db.flush()
        registrar_actividad(
            self.db,
            actor=creador,
            action="sieej.formulario.create",
            resource_type="sieej.formulario",
            resource_id=f.id,
            metadata={"slug": f.slug},
        )
        self.db.commit()
        self.db.refresh(f)
        incr(COUNTER_SIEEJ_FORMULARIO_WRITES)
        logger.info(
            "action=sieej.formulario.create actor=%s target=%s slug=%s",
            creador.id,
            f.id,
            f.slug,
        )
        return f

    def actualizar(
        self,
        formulario_id: int,
        data: dict[str, Any],
        *,
        actor: Usuario | None = None,
    ) -> tuple[Formulario, dict[str, Any] | None]:
        """Actualiza el formulario. Si cambia la definicion y ya hay envios,
        clasifica el cambio: uno `menor` se propaga a los envios en proceso al
        dia (sin subir version); uno que `rompe` sube version y congela a
        quien ya empezo (lo vera como actualizacion disponible).

        Devuelve `(formulario, cambio_info)` donde `cambio_info` es
        `{tipo, afectados}` o None si no cambio la definicion.
        """
        f = self.get(formulario_id)
        self._verificar_conflicto(f, data.pop("actualizado_en_esperado", None))
        version_previa = f.version or 1

        nueva_definicion = data.get("definicion")
        definicion_previa = f.definicion
        if nueva_definicion is not None:
            nueva_definicion = normalizar_definicion(nueva_definicion)
            data["definicion"] = nueva_definicion
            try:
                validar_definicion(nueva_definicion)
            except DefinicionInvalidaError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=str(exc),
                ) from exc
            definicion_previa = normalizar_definicion(definicion_previa)
            cambia_definicion = nueva_definicion != definicion_previa
        else:
            cambia_definicion = False

        cambio_info: dict[str, Any] | None = None
        tipo_cambio: str | None = None
        if cambia_definicion and self._tiene_envios(f.id):
            tipo_cambio = clasificar_cambio(definicion_previa, nueva_definicion)
            if tipo_cambio == "rompe":
                self.db.add(
                    FormularioVersion(
                        formulario_id=f.id,
                        version=version_previa,
                        definicion=definicion_previa,
                        actor_usuario_id=actor.id if actor else None,
                    )
                )
                f.version = version_previa + 1

        for campo in (
            "nombre",
            "descripcion",
            "definicion",
            "vigencia_inicio",
            "vigencia_fin",
            "publico",
        ):
            if campo in data and data[campo] is not None:
                setattr(f, campo, data[campo])

        # `periodicidad` admite limpiarse (None) para volver el formulario a
        # ventana unica; por eso se maneja aparte del loop (que ignora None).
        if "periodicidad" in data:
            f.periodicidad = self._normalizar_periodicidad(data["periodicidad"])

        if actor is not None:
            f.actualizado_por_id = actor.id

        afectados = 0
        if tipo_cambio == "menor":
            afectados = (
                self.db.query(EnvioFormulario)
                .filter(
                    EnvioFormulario.formulario_id == f.id,
                    EnvioFormulario.estado == "en_proceso",
                    EnvioFormulario.formulario_version == f.version,
                )
                .update(
                    {"definicion_snapshot": nueva_definicion},
                    synchronize_session=False,
                )
            )
        reabiertos = 0
        if tipo_cambio == "rompe":
            afectados = (
                self.db.query(func.count(EnvioFormulario.id))
                .filter(
                    EnvioFormulario.formulario_id == f.id,
                    EnvioFormulario.estado == "en_proceso",
                    EnvioFormulario.formulario_version < f.version,
                )
                .scalar()
            ) or 0
            reabiertos = EnviosService(self.db).reabrir_enviados_por_cambio(
                f, actor=actor
            )
        if tipo_cambio is not None:
            cambio_info = {
                "tipo": tipo_cambio,
                "afectados": afectados,
                "reabiertos": reabiertos,
            }

        f.actualizado_en = utcnow()
        registrar_actividad(
            self.db,
            actor=actor,
            action="sieej.formulario.update",
            resource_type="sieej.formulario",
            resource_id=f.id,
            metadata={
                "slug": f.slug,
                "definicion_changed": cambia_definicion,
                "tipo_cambio": tipo_cambio,
                "reabiertos": reabiertos,
                "version_from": version_previa,
                "version_to": f.version,
            },
        )
        self.db.commit()
        self.db.refresh(f)
        incr(COUNTER_SIEEJ_FORMULARIO_WRITES)
        logger.info(
            "action=sieej.formulario.update actor=%s target=%s slug=%s "
            "definicion_changed=%s tipo_cambio=%s version_from=%s version_to=%s",
            actor.id if actor else None,
            f.id,
            f.slug,
            cambia_definicion,
            tipo_cambio,
            version_previa,
            f.version,
        )
        return f, cambio_info

    def publicar(
        self, formulario_id: int, *, actor: Usuario | None = None
    ) -> Formulario:
        f = self.get(formulario_id)
        estado_previo = f.estado
        f.estado = "activo"
        f.actualizado_en = utcnow()
        if f.periodicidad:
            # Materializa el periodo vigente y el siguiente para que el
            # respondent vea de inmediato la ventana abierta o su proxima fecha.
            from app.services.sieej.periodos_service import PeriodosService

            PeriodosService(self.db).materializar_periodos(f)
        self.db.commit()
        self.db.refresh(f)
        logger.info(
            "action=sieej.formulario.publicar actor=%s target=%s slug=%s "
            "estado_from=%s estado_to=activo",
            actor.id if actor else None,
            f.id,
            f.slug,
            estado_previo,
        )
        return f

    def cerrar(
        self, formulario_id: int, *, actor: Usuario | None = None
    ) -> Formulario:
        f = self.get(formulario_id)
        estado_previo = f.estado
        f.estado = "cerrado"
        f.actualizado_en = utcnow()
        self.db.commit()
        self.db.refresh(f)
        logger.info(
            "action=sieej.formulario.cerrar actor=%s target=%s slug=%s "
            "estado_from=%s estado_to=cerrado",
            actor.id if actor else None,
            f.id,
            f.slug,
            estado_previo,
        )
        return f

    def eliminar(
        self, formulario_id: int, *, actor: Usuario | None = None
    ) -> Formulario | None:
        f = self.get(formulario_id)
        if self._tiene_envios(f.id):
            return self.cerrar(formulario_id, actor=actor)
        f_id = f.id
        f_slug = f.slug
        self.db.delete(f)
        self.db.commit()
        logger.info(
            "action=sieej.formulario.delete actor=%s target=%s slug=%s",
            actor.id if actor else None,
            f_id,
            f_slug,
        )
        return None

    def actualizar_asignaciones(
        self,
        formulario_id: int,
        grupos_ids: list[int],
        usuarios_ids: list[int],
    ) -> Formulario:
        f = self.get(formulario_id)

        # Validar que los grupos y usuarios existan
        if grupos_ids:
            grupos_validos = (
                self.db.query(Grupo.id)
                .filter(Grupo.id.in_(grupos_ids))
                .all()
            )
            if len(grupos_validos) != len(set(grupos_ids)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Algun grupo no existe",
                )
        if usuarios_ids:
            usuarios_validos = (
                self.db.query(Usuario.id)
                .filter(Usuario.id.in_(usuarios_ids))
                .all()
            )
            if len(usuarios_validos) != len(set(usuarios_ids)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Algun usuario no existe",
                )

        # Reemplazar asignaciones (delete + insert)
        self.db.execute(
            formulario_grupo.delete().where(formulario_grupo.c.formulario_id == f.id)
        )
        self.db.execute(
            formulario_usuario.delete().where(
                formulario_usuario.c.formulario_id == f.id
            )
        )
        for gid in set(grupos_ids):
            self.db.execute(
                formulario_grupo.insert().values(formulario_id=f.id, grupo_id=gid)
            )
        for uid in set(usuarios_ids):
            self.db.execute(
                formulario_usuario.insert().values(formulario_id=f.id, usuario_id=uid)
            )

        self.db.commit()
        self.db.refresh(f)
        return f

    def listar_envios(
        self,
        formulario_id: int,
        *,
        estado: str | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[EnvioFormulario], int]:
        self.get(formulario_id)
        q = self.db.query(EnvioFormulario).filter(
            EnvioFormulario.formulario_id == formulario_id
        )
        if estado is not None:
            q = q.filter(EnvioFormulario.estado == estado)
        total = q.count()
        items = (
            q.order_by(EnvioFormulario.actualizado_en.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    def get_envio(self, formulario_id: int, envio_id: int) -> EnvioFormulario:
        envio = (
            self.db.query(EnvioFormulario)
            .filter(
                EnvioFormulario.formulario_id == formulario_id,
                EnvioFormulario.id == envio_id,
            )
            .first()
        )
        if envio is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Envio no encontrado",
            )
        return envio

    def listar_historial_envio(
        self, formulario_id: int, envio_id: int
    ) -> list[EnvioValorHistorial]:
        """Historial de cambios de valor de un envio (orden cronologico)."""
        self.get_envio(formulario_id, envio_id)
        return (
            self.db.query(EnvioValorHistorial)
            .filter(EnvioValorHistorial.envio_id == envio_id)
            .order_by(EnvioValorHistorial.cambiado_en)
            .all()
        )

    def historial_de_formulario(
        self, formulario_id: int
    ) -> list[EnvioValorHistorial]:
        """Historial de cambios de valor de todos los envios del formulario."""
        return (
            self.db.query(EnvioValorHistorial)
            .join(
                EnvioFormulario,
                EnvioFormulario.id == EnvioValorHistorial.envio_id,
            )
            .filter(EnvioFormulario.formulario_id == formulario_id)
            .order_by(
                EnvioValorHistorial.envio_id,
                EnvioValorHistorial.cambiado_en,
            )
            .all()
        )

    def reabrir_envio(
        self,
        formulario_id: int,
        envio_id: int,
        actor: Usuario,
    ) -> EnvioFormulario:
        """Devuelve un envio `enviado` o `expirado` al estado `en_proceso`.

        Reglas:
        - Solo un admin (caller con `tetlamamakani` o `editora` con acceso a
          sieej) puede invocarla. La autorizacion se hace en el router.
        - El formulario no debe estar `cerrado` ni fuera de vigencia.
        - El envio debe estar en estado `enviado` o `expirado`.
        - Limpia `enviado_en` y `expirado_en`, deja `definicion_snapshot`
          intacta (la version del envio NO se actualiza).
        - Registra evento `reabierto` con `actor_usuario_id` para trazabilidad.
        """
        formulario = self.get(formulario_id)
        if formulario.estado == "cerrado":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede reabrir un envio de un formulario cerrado",
            )
        ahora = utcnow()
        if formulario.vigencia_fin and formulario.vigencia_fin < ahora:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede reabrir un envio fuera de vigencia",
            )

        envio = self.get_envio(formulario_id, envio_id)
        if envio.estado not in {"enviado", "expirado"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El envio en estado '{envio.estado}' no se puede reabrir",
            )

        estado_previo = envio.estado
        envio.estado = "en_proceso"
        envio.enviado_en = None
        envio.expirado_en = None
        envio.actualizado_en = ahora
        self.db.add(
            EnvioEvento(
                envio_id=envio.id,
                tipo="reabierto",
                actor_usuario_id=actor.id,
            )
        )
        registrar_actividad(
            self.db,
            actor=actor,
            action="sieej.envio.reabrir",
            resource_type="sieej.envio",
            resource_id=envio.id,
            metadata={
                "formulario_id": formulario_id,
                "estado_from": estado_previo,
            },
        )
        self.db.commit()
        self.db.refresh(envio)
        incr(COUNTER_SIEEJ_ENVIO_REABIERTO)
        logger.info(
            "action=sieej.envio.reabrir actor=%s target_envio=%s formulario=%s "
            "estado_from=%s estado_to=en_proceso",
            actor.id,
            envio.id,
            formulario_id,
            estado_previo,
        )
        return envio

    def contar_desactualizados(self, formulario_id: int, version_actual: int) -> int:
        """Cuenta los envios que se llenaron con una version anterior de la
        definicion (su snapshot ya no coincide con la definicion vigente)."""
        count = (
            self.db.query(func.count(EnvioFormulario.id))
            .filter(
                EnvioFormulario.formulario_id == formulario_id,
                EnvioFormulario.formulario_version < version_actual,
            )
            .scalar()
        )
        return count or 0

    def _tiene_envios(self, formulario_id: int) -> bool:
        count = (
            self.db.query(func.count(EnvioFormulario.id))
            .filter(EnvioFormulario.formulario_id == formulario_id)
            .scalar()
        )
        return (count or 0) > 0
