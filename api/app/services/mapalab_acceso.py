from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.layer import Layer
from app.models.mapalab_acceso import (
    MapalabCapaAcceso,
    MapalabGrupo,
    MapalabGrupoMiembro,
    MapalabUsuario,
)


def _no_encontrado(que: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{que} no encontrado")


def _grupos_por_usuario(db: Session) -> dict[int, list[int]]:
    salida: dict[int, list[int]] = {}
    for grupo_id, usuario_id in db.execute(select(MapalabGrupoMiembro.grupo_id, MapalabGrupoMiembro.usuario_id)):
        salida.setdefault(usuario_id, []).append(grupo_id)
    return salida


def _usuario_dict(usuario: MapalabUsuario, grupos: list[int]) -> dict[str, Any]:
    return {
        "id": usuario.id,
        "correo": usuario.correo,
        "nombre": usuario.nombre,
        "activo": usuario.activo,
        "vinculado": usuario.sub is not None,
        "ultimo_acceso": usuario.ultimo_acceso,
        "grupos": sorted(grupos),
    }


def listar_usuarios(db: Session) -> list[dict[str, Any]]:
    grupos = _grupos_por_usuario(db)
    usuarios = db.execute(select(MapalabUsuario).order_by(func.lower(MapalabUsuario.correo))).scalars()
    return [_usuario_dict(u, grupos.get(u.id, [])) for u in usuarios]


def crear_usuario(db: Session, correo: str, nombre: str | None) -> dict[str, Any]:
    existente = db.execute(
        select(MapalabUsuario.id).where(func.lower(MapalabUsuario.correo) == correo.lower())
    ).scalar()
    if existente is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese correo")
    usuario = MapalabUsuario(correo=correo.strip(), nombre=(nombre or "").strip() or None)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return _usuario_dict(usuario, [])


def actualizar_usuario(db: Session, usuario_id: int, cambios: dict[str, Any]) -> dict[str, Any]:
    usuario = db.get(MapalabUsuario, usuario_id)
    if usuario is None:
        raise _no_encontrado("Usuario")
    if cambios.get("activo") is not None:
        usuario.activo = cambios["activo"]
    if "nombre" in cambios:
        usuario.nombre = (cambios["nombre"] or "").strip() or None
    db.commit()
    return _usuario_dict(usuario, _grupos_por_usuario(db).get(usuario.id, []))


def eliminar_usuario(db: Session, usuario_id: int) -> None:
    usuario = db.get(MapalabUsuario, usuario_id)
    if usuario is None:
        raise _no_encontrado("Usuario")
    db.delete(usuario)
    db.commit()


def _validar_ids(db: Session, modelo: Any, ids: list[int], que: str) -> list[int]:
    unicos = sorted(set(ids))
    if not unicos:
        return []
    encontrados = set(db.execute(select(modelo.id).where(modelo.id.in_(unicos))).scalars())
    faltantes = [i for i in unicos if i not in encontrados]
    if faltantes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{que} inexistentes: {faltantes}")
    return unicos


def listar_grupos(db: Session) -> list[dict[str, Any]]:
    miembros: dict[int, list[int]] = {}
    for grupo_id, usuario_id in db.execute(select(MapalabGrupoMiembro.grupo_id, MapalabGrupoMiembro.usuario_id)):
        miembros.setdefault(grupo_id, []).append(usuario_id)
    capas = dict(db.execute(
        select(MapalabCapaAcceso.grupo_id, func.count()).where(MapalabCapaAcceso.grupo_id.is_not(None)).group_by(MapalabCapaAcceso.grupo_id)
    ).all())
    grupos = db.execute(select(MapalabGrupo).order_by(func.lower(MapalabGrupo.nombre))).scalars()
    return [
        {"id": g.id, "nombre": g.nombre, "descripcion": g.descripcion, "miembros": sorted(miembros.get(g.id, [])), "capas": capas.get(g.id, 0)}
        for g in grupos
    ]


def guardar_grupo(db: Session, grupo_id: int | None, datos: dict[str, Any]) -> dict[str, Any]:
    nombre = datos["nombre"].strip()
    repetido = db.execute(
        select(MapalabGrupo.id).where(func.lower(MapalabGrupo.nombre) == nombre.lower(), MapalabGrupo.id != (grupo_id or 0))
    ).scalar()
    if repetido is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un grupo con ese nombre")
    if grupo_id is None:
        grupo = MapalabGrupo()
        db.add(grupo)
    else:
        grupo = db.get(MapalabGrupo, grupo_id)
        if grupo is None:
            raise _no_encontrado("Grupo")
    grupo.nombre = nombre
    grupo.descripcion = (datos.get("descripcion") or "").strip() or None
    miembros = _validar_ids(db, MapalabUsuario, datos.get("miembros") or [], "Usuarios")
    db.flush()
    db.query(MapalabGrupoMiembro).filter(MapalabGrupoMiembro.grupo_id == grupo.id).delete()
    db.add_all(MapalabGrupoMiembro(grupo_id=grupo.id, usuario_id=u) for u in miembros)
    db.commit()
    return next(g for g in listar_grupos(db) if g["id"] == grupo.id)


def eliminar_grupo(db: Session, grupo_id: int) -> None:
    grupo = db.get(MapalabGrupo, grupo_id)
    if grupo is None:
        raise _no_encontrado("Grupo")
    db.delete(grupo)
    db.commit()


def _ancestros_privados(db: Session, capa: Layer) -> list[str]:
    privados: list[str] = []
    vistos = {capa.id}
    padre_id = capa.parent_id
    while padre_id and padre_id not in vistos:
        vistos.add(padre_id)
        padre = db.get(Layer, padre_id)
        if padre is None:
            break
        if padre.privada:
            privados.append(padre.id)
        padre_id = padre.parent_id
    return privados


def _capa(db: Session, layer_id: str) -> Layer:
    capa = db.get(Layer, layer_id)
    if capa is None or capa.deleted_at is not None:
        raise _no_encontrado("Capa")
    return capa


def acceso_de_capa(db: Session, layer_id: str) -> dict[str, Any]:
    capa = _capa(db, layer_id)
    filas = db.execute(
        select(MapalabCapaAcceso.usuario_id, MapalabCapaAcceso.grupo_id).where(MapalabCapaAcceso.layer_id == layer_id)
    ).all()
    return {
        "layer_id": capa.id,
        "label": capa.label,
        "privada": bool(capa.privada),
        "heredada_de": _ancestros_privados(db, capa),
        "usuarios": sorted(u for u, _ in filas if u is not None),
        "grupos": sorted(g for _, g in filas if g is not None),
    }


def guardar_acceso(db: Session, layer_id: str, datos: dict[str, Any], actor: str) -> dict[str, Any]:
    capa = _capa(db, layer_id)
    usuarios = _validar_ids(db, MapalabUsuario, datos.get("usuarios") or [], "Usuarios")
    grupos = _validar_ids(db, MapalabGrupo, datos.get("grupos") or [], "Grupos")
    capa.privada = bool(datos["privada"])
    capa.updated_by = actor
    db.query(MapalabCapaAcceso).filter(MapalabCapaAcceso.layer_id == layer_id).delete()
    if capa.privada:
        db.add_all(MapalabCapaAcceso(layer_id=layer_id, usuario_id=u) for u in usuarios)
        db.add_all(MapalabCapaAcceso(layer_id=layer_id, grupo_id=g) for g in grupos)
    db.commit()
    return acceso_de_capa(db, layer_id)


def capas_privadas(db: Session) -> list[dict[str, Any]]:
    conteos: dict[str, dict[str, int]] = {}
    for layer_id, usuario_id, grupo_id in db.execute(
        select(MapalabCapaAcceso.layer_id, MapalabCapaAcceso.usuario_id, MapalabCapaAcceso.grupo_id)
    ):
        c = conteos.setdefault(layer_id, {"usuarios": 0, "grupos": 0})
        c["usuarios" if usuario_id is not None else "grupos"] += 1
    capas = db.execute(
        select(Layer).where(Layer.privada.is_(True), Layer.deleted_at.is_(None)).order_by(Layer.label)
    ).scalars()
    return [
        {"id": c.id, "label": c.label, "node_type": c.node_type, **conteos.get(c.id, {"usuarios": 0, "grupos": 0})}
        for c in capas
    ]
