"""Servicio admin de formularios.

CRUD + publicar/cerrar + asignaciones + listado de envios. Bump de
version cuando un formulario con envios cambia su definicion.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.sieej import (
    EnvioFormulario,
    Formulario,
    Grupo,
    formulario_grupo,
    formulario_usuario,
)
from app.models.user import Usuario
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
        self.db.commit()
        self.db.refresh(f)
        return f

    def actualizar(self, formulario_id: int, data: dict[str, Any]) -> Formulario:
        f = self.get(formulario_id)

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
        self.db.commit()
        self.db.refresh(f)
        return f

    def publicar(self, formulario_id: int) -> Formulario:
        f = self.get(formulario_id)
        f.estado = "activo"
        f.actualizado_en = utcnow()
        self.db.commit()
        self.db.refresh(f)
        return f

    def cerrar(self, formulario_id: int) -> Formulario:
        f = self.get(formulario_id)
        f.estado = "cerrado"
        f.actualizado_en = utcnow()
        self.db.commit()
        self.db.refresh(f)
        return f

    def eliminar(self, formulario_id: int) -> Formulario | None:
        f = self.get(formulario_id)
        if self._tiene_envios(f.id):
            # Si tiene envios, no se borra: se cierra (preserva datos historicos).
            return self.cerrar(formulario_id)
        self.db.delete(f)
        self.db.commit()
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

    def _tiene_envios(self, formulario_id: int) -> bool:
        count = (
            self.db.query(func.count(EnvioFormulario.id))
            .filter(EnvioFormulario.formulario_id == formulario_id)
            .scalar()
        )
        return (count or 0) > 0
