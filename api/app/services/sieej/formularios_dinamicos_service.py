"""Servicio de la plataforma de formularios dinamicos (respondent).

Resuelve visibilidad y lookup por slug. La logica de creacion/edicion
de formularios vive en el service admin (Fase 2).
"""
from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLE
from app.core.time import utcnow
from app.models.sieej import (
    EnvioFormulario,
    Formulario,
    formulario_grupo,
    formulario_usuario,
    usuario_grupo,
)
from app.models.user import Usuario


class FormulariosDinamicosService:
    def __init__(self, db: Session):
        self.db = db

    def listar_visibles(self, user: Usuario) -> list[dict]:
        ahora = utcnow()
        base_query = (
            self.db.query(Formulario)
            .filter(Formulario.estado == "activo")
            .filter(
                or_(
                    Formulario.vigencia_inicio.is_(None),
                    Formulario.vigencia_inicio <= ahora,
                )
            )
            .filter(
                or_(
                    Formulario.vigencia_fin.is_(None),
                    Formulario.vigencia_fin >= ahora,
                )
            )
        )

        if user.role != ADMIN_ROLE:
            grupos_select = (
                select(usuario_grupo.c.grupo_id)
                .where(usuario_grupo.c.usuario_id == user.id)
            )
            via_grupo = (
                select(formulario_grupo.c.formulario_id)
                .where(formulario_grupo.c.grupo_id.in_(grupos_select))
            )
            via_usuario = (
                select(formulario_usuario.c.formulario_id)
                .where(formulario_usuario.c.usuario_id == user.id)
            )
            base_query = base_query.filter(
                or_(
                    Formulario.id.in_(via_grupo),
                    Formulario.id.in_(via_usuario),
                )
            )

        formularios = base_query.order_by(Formulario.creado_en.desc()).all()
        if not formularios:
            return []

        envios = {
            e.formulario_id: e
            for e in self.db.query(EnvioFormulario)
            .filter(
                EnvioFormulario.usuario_id == user.id,
                EnvioFormulario.formulario_id.in_([f.id for f in formularios]),
            )
            .all()
        }

        items = []
        for f in formularios:
            envio = envios.get(f.id)
            estado_envio = "no_iniciado" if envio is None else envio.estado
            items.append(
                {
                    "id": f.id,
                    "slug": f.slug,
                    "nombre": f.nombre,
                    "descripcion": f.descripcion,
                    "estado": f.estado,
                    "vigencia_inicio": f.vigencia_inicio,
                    "vigencia_fin": f.vigencia_fin,
                    "estado_envio": estado_envio,
                }
            )
        return items

    def get_by_slug_visible(
        self, slug: str, user: Usuario, *, include_inactive: bool = False
    ) -> Formulario | None:
        formulario = (
            self.db.query(Formulario).filter(Formulario.slug == slug).first()
        )
        if formulario is None:
            return None
        if user.role == ADMIN_ROLE:
            return formulario
        if not self._user_puede_ver(formulario, user):
            return None
        if not include_inactive and formulario.estado != "activo":
            return None
        return formulario

    def _user_puede_ver(self, formulario: Formulario, user: Usuario) -> bool:
        # asignacion individual
        directo = (
            self.db.query(formulario_usuario)
            .filter(
                formulario_usuario.c.formulario_id == formulario.id,
                formulario_usuario.c.usuario_id == user.id,
            )
            .first()
        )
        if directo is not None:
            return True
        # asignacion via grupo
        via_grupo = (
            self.db.query(formulario_grupo)
            .join(
                usuario_grupo,
                usuario_grupo.c.grupo_id == formulario_grupo.c.grupo_id,
            )
            .filter(
                formulario_grupo.c.formulario_id == formulario.id,
                usuario_grupo.c.usuario_id == user.id,
            )
            .first()
        )
        return via_grupo is not None
