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
    FormularioPeriodo,
    formulario_grupo,
    formulario_usuario,
    usuario_grupo,
)
from app.models.user import Usuario
from app.services.sieej.periodos_service import periodo_relevante


class FormulariosDinamicosService:
    def __init__(self, db: Session):
        self.db = db

    def listar_visibles(self, user: Usuario) -> list[dict]:
        ahora = utcnow()
        # Los formularios periodicos permanecen visibles aunque su ventana este
        # cerrada (para mostrar "proxima apertura"); su disponibilidad la rige la
        # periodicidad, no la vigencia. Por eso la vigencia solo filtra a los no
        # periodicos.
        base_query = (
            self.db.query(Formulario)
            .filter(Formulario.estado == "activo")
            .filter(
                or_(
                    Formulario.periodicidad.isnot(None),
                    Formulario.vigencia_inicio.is_(None),
                    Formulario.vigencia_inicio <= ahora,
                )
            )
            .filter(
                or_(
                    Formulario.periodicidad.isnot(None),
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

        ids = [f.id for f in formularios]
        envios_rows = (
            self.db.query(EnvioFormulario)
            .filter(
                EnvioFormulario.usuario_id == user.id,
                EnvioFormulario.formulario_id.in_(ids),
            )
            .all()
        )
        # Indexado dual: los no periodicos por formulario; los periodicos por
        # (formulario, periodo) para no colapsar el historial a un solo envio.
        envio_no_periodico: dict[int, EnvioFormulario] = {}
        envio_por_periodo: dict[tuple[int, int], EnvioFormulario] = {}
        for e in envios_rows:
            if e.periodo_id is None:
                envio_no_periodico[e.formulario_id] = e
            else:
                envio_por_periodo[(e.formulario_id, e.periodo_id)] = e

        hay_periodicos = any(f.periodicidad for f in formularios)
        periodo_por_clave: dict[tuple[int, str], FormularioPeriodo] = {}
        if hay_periodicos:
            for p in (
                self.db.query(FormularioPeriodo)
                .filter(FormularioPeriodo.formulario_id.in_(ids))
                .all()
            ):
                periodo_por_clave[(p.formulario_id, p.clave)] = p

        from app.services.sieej.envios_service import EnviosService

        items = []
        for f in formularios:
            item = {
                "id": f.id,
                "slug": f.slug,
                "nombre": f.nombre,
                "descripcion": f.descripcion,
                "estado": f.estado,
                "vigencia_inicio": f.vigencia_inicio,
                "vigencia_fin": f.vigencia_fin,
                "periodico": bool(f.periodicidad),
                "abierto": True,
                "ventana_apertura": None,
                "ventana_cierre": None,
                "proxima_apertura": None,
            }
            if f.periodicidad:
                clave, apertura, cierre = periodo_relevante(f.periodicidad, ahora)
                abierto = apertura <= ahora < cierre
                periodo = periodo_por_clave.get((f.id, clave))
                envio = (
                    envio_por_periodo.get((f.id, periodo.id))
                    if periodo is not None
                    else None
                )
                item["abierto"] = abierto
                item["ventana_apertura"] = apertura
                item["ventana_cierre"] = cierre
                item["proxima_apertura"] = None if abierto else apertura
            else:
                envio = envio_no_periodico.get(f.id)

            estado_envio = "no_iniciado" if envio is None else envio.estado
            actualizacion = False
            if envio is not None and envio.estado == "en_proceso":
                info = EnviosService.info_cambios(f, envio)
                actualizacion = info["actualizacion_disponible"]

            item["estado_envio"] = estado_envio
            item["envio_id"] = envio.id if envio is not None else None
            item["actualizacion_disponible"] = actualizacion
            item["tiene_campos_editables"] = (
                estado_envio == "enviado"
                and envio is not None
                and bool(
                    EnviosService.editable_field_paths(
                        envio.definicion_snapshot or f.definicion or {},
                        f.definicion,
                    )
                )
            )
            items.append(item)
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
