"""Servicio admin de grupos de respondents.

CRUD basico + manejo de miembros. Un grupo no puede borrarse si tiene
formularios asignados (devuelve 400; el caller decide desasignar primero).
"""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.sieej import Formulario, Grupo, formulario_grupo, usuario_grupo
from app.models.user import Usuario


class GruposService:
    def __init__(self, db: Session):
        self.db = db

    def listar(self) -> list[Grupo]:
        return self.db.query(Grupo).order_by(Grupo.nombre.asc()).all()

    def get(self, grupo_id: int) -> Grupo:
        g = self.db.query(Grupo).filter(Grupo.id == grupo_id).first()
        if g is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Grupo no encontrado",
            )
        return g

    def crear(
        self,
        nombre: str,
        descripcion: str | None = None,
        member_ids: list[int] | None = None,
    ) -> Grupo:
        if self.db.query(Grupo).filter(Grupo.nombre == nombre).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un grupo con nombre '{nombre}'",
            )
        members = set(member_ids or [])
        if members:
            found = self.db.query(Usuario.id).filter(Usuario.id.in_(members)).all()
            if len(found) != len(members):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Algun usuario no existe",
                )
        g = Grupo(nombre=nombre, descripcion=descripcion)
        self.db.add(g)
        self.db.flush()
        for uid in members:
            self.db.execute(
                usuario_grupo.insert().values(usuario_id=uid, grupo_id=g.id)
            )
        self.db.commit()
        self.db.refresh(g)
        return g

    def actualizar(
        self,
        grupo_id: int,
        nombre: str | None = None,
        descripcion: str | None = None,
    ) -> Grupo:
        g = self.get(grupo_id)
        if nombre is not None and nombre != g.nombre:
            if self.db.query(Grupo).filter(Grupo.nombre == nombre).first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe un grupo con nombre '{nombre}'",
                )
            g.nombre = nombre
        if descripcion is not None:
            g.descripcion = descripcion
        self.db.commit()
        self.db.refresh(g)
        return g

    def eliminar(self, grupo_id: int) -> None:
        g = self.get(grupo_id)
        formularios_asignados = (
            self.db.query(func.count(formulario_grupo.c.formulario_id))
            .filter(formulario_grupo.c.grupo_id == g.id)
            .scalar()
        )
        if formularios_asignados:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"El grupo tiene {formularios_asignados} formulario(s) asignados. "
                    "Desasigna primero antes de borrar."
                ),
            )
        self.db.delete(g)
        self.db.commit()

    def actualizar_miembros(
        self,
        grupo_id: int,
        usuarios_ids: list[int],
        coordinadores_ids: list[int] | None = None,
    ) -> Grupo:
        """Sincroniza la membresia por diferencia, no por borrado en bloque.

        `usuario_grupo` guarda tambien el `rol` del miembro: borrar la tabla y
        reinsertarla degradaria a capturista a todos los coordinadores del grupo
        en cada edicion.
        """
        g = self.get(grupo_id)
        self._verificar_coordinador(g, usuarios_ids, coordinadores_ids)
        if usuarios_ids:
            validos = self.db.query(Usuario.id).filter(Usuario.id.in_(usuarios_ids)).all()
            if len(validos) != len(set(usuarios_ids)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Algun usuario no existe",
                )
        actuales = {
            fila[0]
            for fila in self.db.query(usuario_grupo.c.usuario_id)
            .filter(usuario_grupo.c.grupo_id == g.id)
            .all()
        }
        deseados = set(usuarios_ids)
        for uid in actuales - deseados:
            self.db.execute(
                usuario_grupo.delete().where(
                    usuario_grupo.c.grupo_id == g.id,
                    usuario_grupo.c.usuario_id == uid,
                )
            )
        for uid in deseados - actuales:
            self.db.execute(
                usuario_grupo.insert().values(usuario_id=uid, grupo_id=g.id)
            )
        if coordinadores_ids is not None:
            coordinadores = deseados & set(coordinadores_ids)
            for uid in deseados:
                self.db.execute(
                    usuario_grupo.update()
                    .where(
                        usuario_grupo.c.grupo_id == g.id,
                        usuario_grupo.c.usuario_id == uid,
                    )
                    .values(
                        rol="coordinador" if uid in coordinadores else "capturista"
                    )
                )
        self.db.commit()
        self.db.refresh(g)
        return g

    def _verificar_coordinador(
        self,
        grupo: Grupo,
        usuarios_ids: list[int],
        coordinadores_ids: list[int] | None,
    ) -> None:
        """Un grupo que llena formularios colaborativos necesita coordinador.

        Sin el, nadie puede cerrar el envio del grupo y el equipo captura sin
        poder entregar. Solo se exige donde importa: un grupo sin formularios
        colaborativos puede quedarse sin coordinador sin consecuencias.
        """
        if coordinadores_ids is None or not usuarios_ids:
            return
        if set(coordinadores_ids) & set(usuarios_ids):
            return
        colaborativos = [
            nombre
            for (nombre,) in self.db.query(Formulario.nombre)
            .join(
                formulario_grupo,
                formulario_grupo.c.formulario_id == Formulario.id,
            )
            .filter(
                formulario_grupo.c.grupo_id == grupo.id,
                Formulario.colaborativo.is_(True),
            )
            .all()
        ]
        if colaborativos:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "El grupo necesita al menos un coordinador: sin el nadie podra "
                    f"enviar {', '.join(colaborativos)}."
                ),
            )

    def listar_miembros(self, grupo_id: int) -> list[tuple[Usuario, str]]:
        """Miembros del grupo con su rol, ordenados por username."""
        g = self.get(grupo_id)
        return (
            self.db.query(Usuario, usuario_grupo.c.rol)
            .join(usuario_grupo, usuario_grupo.c.usuario_id == Usuario.id)
            .filter(usuario_grupo.c.grupo_id == g.id)
            .order_by(Usuario.username.asc())
            .all()
        )
