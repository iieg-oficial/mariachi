"""Resolucion del grupo con el que un usuario entra a un formulario colaborativo.

En un formulario con `colaborativo` activo el envio pertenece al grupo, no a la
persona: `envio_formulario.grupo_id` sustituye a `usuario_id` como identidad del
envio, y `usuario_id` queda como "quien lo inicio".

Un usuario asignado individualmente (`formulario_usuario`) a un formulario
colaborativo no resuelve grupo y captura solo, con un envio individual. Es
deliberado: la asignacion directa es individual aunque el formulario admita
grupos.
"""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.sieej import (
    Formulario,
    Grupo,
    formulario_grupo,
    usuario_grupo,
)
from app.models.user import Usuario


def es_miembro(db: Session, usuario_id: int, grupo_id: int) -> bool:
    fila = (
        db.query(usuario_grupo)
        .filter(
            usuario_grupo.c.usuario_id == usuario_id,
            usuario_grupo.c.grupo_id == grupo_id,
        )
        .first()
    )
    return fila is not None


def grupos_del_usuario(
    db: Session, formulario: Formulario, user: Usuario
) -> list[Grupo]:
    return (
        db.query(Grupo)
        .join(usuario_grupo, usuario_grupo.c.grupo_id == Grupo.id)
        .join(formulario_grupo, formulario_grupo.c.grupo_id == Grupo.id)
        .filter(
            usuario_grupo.c.usuario_id == user.id,
            formulario_grupo.c.formulario_id == formulario.id,
        )
        .order_by(Grupo.nombre.asc())
        .all()
    )


def resolver_grupo(
    db: Session,
    formulario: Formulario,
    user: Usuario,
    grupo_id: int | None = None,
) -> int | None:
    """Grupo dueno del envio, o None si el envio es individual.

    Con mas de un grupo candidato y sin `grupo_id` explicito no hay forma de
    adivinar: 409 con la lista para que el cliente elija.
    """
    if not formulario.colaborativo:
        return None
    candidatos = grupos_del_usuario(db, formulario, user)
    if not candidatos:
        return None
    if grupo_id is not None:
        if grupo_id not in {g.id for g in candidatos}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No perteneces a ese grupo",
            )
        return grupo_id
    if len(candidatos) == 1:
        return candidatos[0].id
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "codigo": "grupo_ambiguo",
            "mensaje": "Perteneces a mas de un grupo asignado a este formulario",
            "grupos": [{"id": g.id, "nombre": g.nombre} for g in candidatos],
        },
    )


def grupo_por_formulario(
    db: Session, user: Usuario, formularios: list[Formulario]
) -> dict[int, int]:
    """Grupo del usuario en cada formulario colaborativo, para el listado.

    A diferencia de `resolver_grupo` no falla ante la ambiguedad: el listado es
    de lectura y el 409 pertenece a la entrada al formulario. Con varios grupos
    toma el primero por nombre, que es el mismo que veria el usuario.
    """
    ids = [f.id for f in formularios if f.colaborativo]
    if not ids:
        return {}
    filas = (
        db.query(formulario_grupo.c.formulario_id, Grupo.id, Grupo.nombre)
        .select_from(formulario_grupo)
        .join(Grupo, Grupo.id == formulario_grupo.c.grupo_id)
        .join(usuario_grupo, usuario_grupo.c.grupo_id == Grupo.id)
        .filter(
            formulario_grupo.c.formulario_id.in_(ids),
            usuario_grupo.c.usuario_id == user.id,
        )
        .order_by(Grupo.nombre.asc())
        .all()
    )
    resuelto: dict[int, int] = {}
    for formulario_id, grupo_id, _nombre in filas:
        resuelto.setdefault(formulario_id, grupo_id)
    return resuelto


def rol_en_grupo(db: Session, usuario_id: int, grupo_id: int) -> str | None:
    fila = (
        db.query(usuario_grupo.c.rol)
        .filter(
            usuario_grupo.c.usuario_id == usuario_id,
            usuario_grupo.c.grupo_id == grupo_id,
        )
        .first()
    )
    return fila[0] if fila is not None else None


def es_coordinador(db: Session, usuario_id: int, grupo_id: int) -> bool:
    return rol_en_grupo(db, usuario_id, grupo_id) == "coordinador"
