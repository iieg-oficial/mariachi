"""Migra los archivos de SIEEJ en Acervo a la convencion de claves vigente.

La convencion anterior (`{slug}/envio{id}/{uuid}.{ext}`) dejaba el bucket
ilegible: nombre real, campo y version vigente solo se sabian cruzando con
`sieej.envio_archivo`. La vigente es
`{slug}/{id}-{usuario}[/{periodo}]/{step}.{campo}/{ts}-{nombre}-{sufijo}.{ext}`
(ver `app/services/sieej/acervo_keys.py`).

Por cada fila de `sieej.envio_archivo` con clave vieja:

  1. copia el objeto a su clave nueva dentro del mismo bucket,
  2. reescribe `object_key` y `url_publica` de la fila,
  3. reescribe la entrada correspondiente en `envio_formulario.datos`
     (que guarda su propia copia de la URL) al contrato canonico,
  4. borra el objeto viejo.

Al final escribe el `envio.json` de respaldo de cada envio (datos, definicion
con la que se lleno y catalogo de archivos), que de aqui en adelante el api
mantiene solo al enviar y al actualizar.

NO es una migracion de alembic a proposito: habla con Acervo por red, y si
el bucket no responde durante el bootstrap del api se caeria el arranque
completo. Se corre a mano, despues de `alembic upgrade head`.

Uso:

    # 1) Ver que haria, sin tocar nada (por defecto):
    docker exec mariachi-api python scripts/sieej_migrar_object_keys.py

    # 2) Aplicar (copia, reescribe BD y borra el objeto viejo):
    docker exec mariachi-api python scripts/sieej_migrar_object_keys.py --apply

    # Conservar los objetos viejos en el bucket (respaldo manual):
    docker exec mariachi-api python scripts/sieej_migrar_object_keys.py --apply --conservar-origen

Es idempotente: las filas que ya tienen la clave nueva se saltan. Si el
objeto de origen no existe en el bucket (ya migrado a mano, borrado), la fila
se reporta y no se toca.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.core.database import SessionLocal
from app.models.acervo_bucket import AcervoBucket
from app.models.project import Project
from app.services.acervo import AcervoClient
from app.services.sieej.acervo_keys import construir_object_key, valor_archivo


def _es_clave_vigente(object_key: str) -> bool:
    """La clave vigente es `{slug}/{usuario}-{id}/{step}.{campo}/{archivo}`,
    con un segmento extra para el periodo solo si el formulario es periodico.
    La carpeta del envio siempre termina en `-{id}` (o es el id a secas si el
    envio no tiene usuario resoluble).

    `unico` en la posicion del periodo era un segmento de relleno de una
    version intermedia y hoy no es vigente: esas claves se vuelven a migrar.
    """
    partes = (object_key or "").split("/")
    if len(partes) not in (4, 5) or not re.search(r"(^|-)\d+$", partes[1]):
        return False
    return not (len(partes) == 5 and partes[2] == "unico")


def _cliente_para(db, bucket_name: str, cache: dict) -> AcervoClient | None:
    if bucket_name in cache:
        return cache[bucket_name]
    bucket = (
        db.query(AcervoBucket)
        .join(Project, Project.id == AcervoBucket.project_id)
        .filter(
            AcervoBucket.acervo_bucket == bucket_name,
            AcervoBucket.is_active.is_(True),
        )
        .first()
    )
    cache[bucket_name] = AcervoClient.for_bucket(bucket) if bucket else None
    return cache[bucket_name]


def _reescribir_datos(db, envio_id: int, field_path: str, nuevo: dict) -> bool:
    """Actualiza la entrada del campo en `envio.datos`. Devuelve si cambio."""
    from app.services.sieej.envios_service import EnviosService

    fila = db.execute(
        text("SELECT datos FROM sieej.envio_formulario WHERE id = :id"),
        {"id": envio_id},
    ).scalar()
    datos = json.loads(fila) if isinstance(fila, str) else fila
    if not isinstance(datos, dict):
        return False

    actual = EnviosService._get_valor_en_datos(datos, field_path)
    if not isinstance(actual, dict):
        return False
    if actual.get("object_key") == nuevo["object_key"]:
        return False

    EnviosService._set_archivo_en_datos(datos, field_path, nuevo)
    db.execute(
        text(
            "UPDATE sieej.envio_formulario SET datos = CAST(:d AS json) WHERE id = :id"
        ),
        {"d": json.dumps(datos, ensure_ascii=False), "id": envio_id},
    )
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="aplica los cambios (sin este flag solo reporta)",
    )
    parser.add_argument(
        "--conservar-origen",
        action="store_true",
        help="no borra el objeto viejo tras copiarlo",
    )
    parser.add_argument(
        "--sin-respaldo",
        action="store_true",
        help="no genera el `envio.json` de los envios existentes",
    )
    args = parser.parse_args()

    try:
        db = SessionLocal()
    except Exception as exc:
        print(json.dumps({"error": f"db connection failed: {exc}"}), file=sys.stderr)
        return 1

    clientes: dict = {}
    resumen = {
        "revisados": 0,
        "ya_migrados": 0,
        "migrados": 0,
        "respaldados": 0,
        "sin_objeto": [],
        "errores": [],
    }

    try:
        filas = db.execute(
            text(
                "SELECT a.id, a.envio_id, a.field_path, a.bucket, a.object_key, "
                "       a.filename_original, a.mime, a.size_bytes, a.subido_en, "
                "       e.periodo_id, f.slug, u.username "
                "FROM sieej.envio_archivo a "
                "JOIN sieej.envio_formulario e ON e.id = a.envio_id "
                "JOIN sieej.formulario f ON f.id = e.formulario_id "
                "LEFT JOIN usuarios u ON u.id = e.usuario_id "
                "ORDER BY a.id"
            )
        ).mappings().all()

        for fila in filas:
            resumen["revisados"] += 1
            if _es_clave_vigente(fila["object_key"]):
                resumen["ya_migrados"] += 1
                continue

            periodo_clave = None
            if fila["periodo_id"] is not None:
                periodo_clave = db.execute(
                    text("SELECT clave FROM sieej.formulario_periodo WHERE id = :id"),
                    {"id": fila["periodo_id"]},
                ).scalar()

            nueva_key = construir_object_key(
                slug=fila["slug"],
                envio_id=fila["envio_id"],
                field_path=fila["field_path"],
                filename=fila["filename_original"],
                usuario=fila["username"],
                periodo_clave=periodo_clave,
                momento=fila["subido_en"],
            )

            cliente = _cliente_para(db, fila["bucket"], clientes)
            if cliente is None:
                resumen["errores"].append(
                    {"id": fila["id"], "error": f"bucket '{fila['bucket']}' no configurado"}
                )
                continue

            try:
                cliente.stat_object(fila["object_key"])
            except Exception:
                resumen["sin_objeto"].append(
                    {"id": fila["id"], "object_key": fila["object_key"]}
                )
                continue

            print(
                json.dumps(
                    {
                        "id": fila["id"],
                        "de": fila["object_key"],
                        "a": nueva_key,
                        "aplicado": args.apply,
                    },
                    ensure_ascii=False,
                )
            )

            if not args.apply:
                resumen["migrados"] += 1
                continue

            try:
                cliente.copy_file(fila["object_key"], nueva_key)
                url = cliente.get_file_url(nueva_key)
                db.execute(
                    text(
                        "UPDATE sieej.envio_archivo "
                        "SET object_key = :k, url_publica = :u WHERE id = :id"
                    ),
                    {"k": nueva_key, "u": url, "id": fila["id"]},
                )
                _reescribir_datos(
                    db,
                    fila["envio_id"],
                    fila["field_path"],
                    valor_archivo(
                        field_path=fila["field_path"],
                        url_publica=url,
                        object_key=nueva_key,
                        filename=fila["filename_original"] or "",
                        mime=fila["mime"] or "application/octet-stream",
                        size_bytes=fila["size_bytes"] or 0,
                    ),
                )
                db.commit()
                if not args.conservar_origen:
                    cliente.delete_file(fila["object_key"])
                resumen["migrados"] += 1
            except Exception as exc:
                db.rollback()
                resumen["errores"].append({"id": fila["id"], "error": str(exc)})

        if args.apply and not args.sin_respaldo:
            from app.models.sieej import EnvioFormulario
            from app.services.sieej.envios_service import EnviosService

            service = EnviosService(db)
            envios = (
                db.query(EnvioFormulario)
                .filter(EnvioFormulario.eliminado_en.is_(None))
                .order_by(EnvioFormulario.id)
                .all()
            )
            for envio in envios:
                if service.respaldar_envio(envio):
                    resumen["respaldados"] += 1
    finally:
        db.close()

    print(json.dumps(resumen, ensure_ascii=False, default=str))
    return 1 if resumen["errores"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
