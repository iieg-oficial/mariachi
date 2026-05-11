"""Servicio admin de formularios.

CRUD + publicar/cerrar + asignaciones + listado de envios. Bump de
version cuando un formulario con envios cambia su definicion.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.time import utcnow
from app.models.sieej import (
    EnvioEvento,
    EnvioFormulario,
    Formulario,
    Grupo,
    formulario_grupo,
    formulario_usuario,
)
from app.models.user import Usuario
from app.services.actividad_service import registrar_actividad
from app.services.sieej.definicion_validator import (
    DefinicionInvalidaError,
    validar_definicion,
)

SLUGS_RESERVADOS = {
    "inicio-sesion",
    "exencion",
    "cambiar-contrasena",
    "error",
    "regisño",
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
        q = self.db.query(Formulario)
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

    def crear(self, data: dict[str, Any], creador: Usuario) -> Formulario:
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
    ) -> Formulario:
        f = self.get(formulario_id)
        version_previa = f.version or 1

        nueva_definicion = data.get("definicion")
        if nueva_definicion is not None:
            try:
                validar_definicion(nueva_definicion)
            except DefinicionInvalidaError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=str(exc),
                ) from exc
            cambia_definicion = nueva_definicion != f.definicion
        else:
            cambia_definicion = False

        if cambia_definicion and self._tiene_envios(f.id):
            f.version = (f.version or 1) + 1

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
                "version_from": version_previa,
                "version_to": f.version,
            },
        )
        self.db.commit()
        self.db.refresh(f)
        logger.info(
            "action=sieej.formulario.update actor=%s target=%s slug=%s "
            "definicion_changed=%s version_from=%s version_to=%s",
            actor.id if actor else None,
            f.id,
            f.slug,
            cambia_definicion,
            version_previa,
            f.version,
        )
        return f

    def publicar(
        self, formulario_id: int, *, actor: Usuario | None = None
    ) -> Formulario:
        f = self.get(formulario_id)
        estado_previo = f.estado
        f.estado = "activo"
        f.actualizado_en = utcnow()
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
        logger.info(
            "action=sieej.envio.reabrir actor=%s target_envio=%s formulario=%s "
            "estado_from=%s estado_to=en_proceso",
            actor.id,
            envio.id,
            formulario_id,
            estado_previo,
        )
        return envio

    def _tiene_envios(self, formulario_id: int) -> bool:
        count = (
            self.db.query(func.count(EnvioFormulario.id))
            .filter(EnvioFormulario.formulario_id == formulario_id)
            .scalar()
        )
        return (count or 0) > 0
