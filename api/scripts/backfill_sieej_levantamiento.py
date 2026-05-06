"""Backfill de envios para sieej-levantamiento.

Para cada usuario con datos en sieej.general / sieej.enlace /
sieej.bases_datos, crea (si no existe) un envio_formulario apuntando
al formulario `sieej-levantamiento` con `datos` armados a partir de
las 3 tablas viejas + envio_archivo para diccionarios subidos.

Es **idempotente**: si el envio ya existe, lo deja como esta.

Estado del envio resultante:
- `enviado` si el usuario tiene general + al menos 1 enlace + al
  menos 1 bd con todos los campos requeridos rellenados.
- `en_proceso` en cualquier otro caso (datos parciales).

Uso:
    docker compose exec api python scripts/backfill_sieej_levantamiento.py [--dry-run]
"""
from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.time import utcnow
from app.models.sieej import (
    BasesDatos,
    Enlace,
    EnvioArchivo,
    EnvioEvento,
    EnvioFormulario,
    Formulario,
    General,
)

SLUG = "sieej-levantamiento"
SIEEJ_DICC_BUCKET = "sieej-diccionarios"


def _bool_to_str(value: bool | None) -> str | None:
    if value is None:
        return None
    return "true" if value else "false"


def _general_to_dict(g: General) -> dict:
    return {
        "nombre_ente_gobierno": g.nombre_ente_gobierno,
        "unidad_admin": g.unidad_admin.value if g.unidad_admin else None,
        "hay_responsable": _bool_to_str(g.hay_responsable),
        "descripcion_hay_responsable": g.descripcion_hay_responsable,
        "desafios_oportunidades": g.desafios_oportunidades,
    }


def _enlace_to_dict(e: Enlace) -> dict:
    return {
        "nombres": e.nombres,
        "apellido1": e.apellido1,
        "apellido2": e.apellido2,
        "direccion": e.direccion,
        "puesto": e.puesto,
        "email": e.email,
        "extension": e.extension,
        "telefono": e.telefono,
        "es_tecnico": _bool_to_str(e.es_tecnico),
        "nombres_jefe": e.nombres_jefe,
        "apellido1_jefe": e.apellido1_jefe,
        "apellido2_jefe": e.apellido2_jefe,
        "puesto_jefe": e.puesto_jefe,
        "email_jefe": e.email_jefe,
    }


def _bd_to_dict(bd: BasesDatos) -> dict:
    return {
        "nombre_bd": bd.nombre_bd,
        "descripcion_bd": bd.descripcion_bd,
        "categoria_datos": bd.categoria_datos.value if bd.categoria_datos else None,
        "ejes_estrategicos": [e.value for e in (bd.ejes_estrategicos or [])],
        "periodicidad": bd.periodicidad.value if bd.periodicidad else None,
        "desc_periodicidad": bd.desc_periodicidad,
        "objetivo_uso": bd.objetivo_uso.value if bd.objetivo_uso else None,
        "usuarios_datos": bd.usuarios_datos.value if bd.usuarios_datos else None,
        "quienes_son": bd.quienes_son,
        "proveedores_bd": bd.proveedores_bd,
        "herramientas_gestion": bd.herramientas_gestion.value if bd.herramientas_gestion else None,
        "calidad_datos": bd.calidad_datos.value if bd.calidad_datos else None,
        "limpieza_validacion": _bool_to_str(bd.limpieza_validacion),
        "desc_limpieza_validacion": bd.desc_limpieza_validacion,
        "historicos": _bool_to_str(bd.historicos),
        "desc_historicos": bd.desc_historicos,
        "migracion_actualizacion": _bool_to_str(bd.migracion_actualizacion),
        "desc_migracion_actualizacion": bd.desc_migracion_actualizacion,
        "medidas_seguridad": _bool_to_str(bd.medidas_seguridad),
        "desc_medidas_seguridad": bd.desc_medidas_seguridad,
        "normativas_proteccion": _bool_to_str(bd.normativas_proteccion),
        "desc_normativas_proteccion": bd.desc_normativas_proteccion,
        "plan_contingencia": _bool_to_str(bd.plan_contingencia),
        "desc_plan_contingencia": bd.desc_plan_contingencia,
        "interoperatividad": _bool_to_str(bd.interoperatividad),
        "desc_interoperatividad": bd.desc_interoperatividad,
        "plataforma_difusion": _bool_to_str(bd.plataforma_difusion),
        "nombre_plataforma_difusion": bd.nombre_plataforma_difusion,
        "url_plataforma_difusion": bd.url_plataforma_difusion,
        "retos": bd.retos,
        "tiene_diccionario": _bool_to_str(bd.tiene_diccionario),
        "diccionario": (
            {
                "url_publica": bd.ruta_diccionario,
                "filename_original": bd.ruta_diccionario.rsplit("/", 1)[-1] if bd.ruta_diccionario else "",
            }
            if bd.tiene_diccionario and bd.ruta_diccionario
            else None
        ),
    }


def _esta_completo(datos: dict) -> bool:
    """Heuristica: general completo + al menos 1 enlace + al menos 1 bd."""
    g = datos.get("general") or {}
    if not g.get("nombre_ente_gobierno") or not g.get("desafios_oportunidades"):
        return False
    if not (datos.get("enlaces") or []):
        return False
    if not (datos.get("bases_datos") or []):
        return False
    return True


def _archivos_para_bd(bd_idx: int, bd: BasesDatos) -> dict | None:
    if not (bd.tiene_diccionario and bd.ruta_diccionario):
        return None
    object_key = bd.ruta_diccionario.rsplit("/", 1)[-1] if "/" in bd.ruta_diccionario else bd.ruta_diccionario
    filename = object_key.split("?", 1)[0]
    return {
        "field_path": f"bases_datos[{bd_idx}].diccionario",
        "bucket": SIEEJ_DICC_BUCKET,
        "object_key": object_key,
        "url_publica": bd.ruta_diccionario,
        "filename_original": filename,
        "mime": "application/octet-stream",
        "size_bytes": 0,
    }


def backfill(db: Session, *, dry_run: bool = False) -> dict:
    formulario = db.query(Formulario).filter(Formulario.slug == SLUG).first()
    if formulario is None:
        return {"error": f"No existe el formulario '{SLUG}'. Aplica la migration seed primero."}

    user_data: dict[int, dict] = defaultdict(lambda: {
        "general": None,
        "enlaces": [],
        "bases_datos": [],
        "archivos": [],
    })

    for g in db.query(General).filter(General.is_active.is_(True)).all():
        user_data[g.user_id]["general"] = _general_to_dict(g)
    for e in db.query(Enlace).filter(Enlace.is_active.is_(True)).order_by(Enlace.id.asc()).all():
        user_data[e.user_id]["enlaces"].append(_enlace_to_dict(e))
    for bd in db.query(BasesDatos).filter(BasesDatos.is_active.is_(True)).order_by(BasesDatos.id.asc()).all():
        bd_idx = len(user_data[bd.user_id]["bases_datos"])
        user_data[bd.user_id]["bases_datos"].append(_bd_to_dict(bd))
        archivo = _archivos_para_bd(bd_idx, bd)
        if archivo:
            user_data[bd.user_id]["archivos"].append(archivo)

    creados = 0
    saltados_existentes = 0
    enviados = 0
    en_proceso = 0
    archivos_creados = 0

    for user_id, payload in user_data.items():
        if all(payload[k] in (None, []) for k in ("general", "enlaces", "bases_datos")):
            continue

        existing = (
            db.query(EnvioFormulario)
            .filter(
                EnvioFormulario.formulario_id == formulario.id,
                EnvioFormulario.usuario_id == user_id,
            )
            .first()
        )
        if existing is not None:
            saltados_existentes += 1
            continue

        datos = {
            "general": payload["general"] or {},
            "enlaces": payload["enlaces"],
            "bases_datos": payload["bases_datos"],
        }
        completo = _esta_completo(datos)
        estado = "enviado" if completo else "en_proceso"
        if completo:
            enviados += 1
        else:
            en_proceso += 1

        if dry_run:
            creados += 1
            archivos_creados += len(payload["archivos"])
            continue

        envio = EnvioFormulario(
            formulario_id=formulario.id,
            formulario_version=formulario.version,
            definicion_snapshot=formulario.definicion,
            usuario_id=user_id,
            estado=estado,
            datos=datos,
            paso_actual=len(formulario.definicion.get("steps", [])) - 1 if completo else 0,
            iniciado_en=utcnow(),
            enviado_en=utcnow() if completo else None,
        )
        db.add(envio)
        db.flush()

        for a in payload["archivos"]:
            db.add(EnvioArchivo(envio_id=envio.id, **a))
            archivos_creados += 1

        db.add(EnvioEvento(
            envio_id=envio.id,
            tipo="iniciado",
            payload={"backfill": True, "fuente": "wizard_legacy"},
            actor_usuario_id=None,
        ))
        if completo:
            db.add(EnvioEvento(
                envio_id=envio.id,
                tipo="enviado",
                payload={"backfill": True},
                actor_usuario_id=None,
            ))

        creados += 1

    if not dry_run:
        db.commit()

    return {
        "creados": creados,
        "saltados_existentes": saltados_existentes,
        "enviados": enviados,
        "en_proceso": en_proceso,
        "archivos_creados": archivos_creados,
        "dry_run": dry_run,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Calcula sin escribir")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        result = backfill(db, dry_run=args.dry_run)
        print("Resultado del backfill sieej-levantamiento:")
        for k, v in result.items():
            print(f"  {k}: {v}")
        return 0 if "error" not in result else 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
