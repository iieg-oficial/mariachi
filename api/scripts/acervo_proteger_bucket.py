"""Activa versionado y retencion de versiones en un bucket de Acervo.

El explorador del CMS permite borrar, renombrar y sobreescribir objetos. En
buckets como el de SIEEJ eso es destructivo: los archivos son la entrega de
una dependencia y su clave esta referenciada desde `sieej.envio_archivo` y
desde `envio.datos`. Sin versionado, un borrado accidental (o un bug) es
irrecuperable.

Con versionado activo:

  - borrar deja un *delete marker* y el objeto se restaura quitandolo,
  - sobreescribir conserva la version anterior.

La regla de ciclo de vida acota el costo: conserva a lo sumo
`--versiones` versiones no vigentes y las expira a los `--dias`.

Sobre el espacio: SIEEJ escribe **una clave nueva por subida** (el nombre
lleva timestamp y sufijo), asi que reemplazar el archivo de un campo no
genera versiones — genera objetos distintos, que es el historial que se
quiere. Las versiones solo aparecen cuando se sobreescribe la misma clave
(el `envio.json`, de unos KB) o cuando alguien borra. El costo real del
versionado aqui es marginal.

Uso:

    docker exec mariachi-api python scripts/acervo_proteger_bucket.py sieej
    docker exec mariachi-api python scripts/acervo_proteger_bucket.py sieej --dias 30 --versiones 3
    docker exec mariachi-api python scripts/acervo_proteger_bucket.py sieej --estado

Idempotente: re-ejecutarlo no cambia nada si ya esta configurado.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from minio.commonconfig import ENABLED, Filter
from minio.lifecycleconfig import LifecycleConfig, NoncurrentVersionExpiration, Rule
from minio.versioningconfig import VersioningConfig

from app.core.database import SessionLocal
from app.models.acervo_bucket import AcervoBucket
from app.models.project import Project
from app.services.acervo import AcervoClient

REGLA_ID = "acervo-retencion-versiones"


def _cliente(db, nombre: str) -> AcervoClient:
    bucket = (
        db.query(AcervoBucket)
        .join(Project, Project.id == AcervoBucket.project_id)
        .filter(AcervoBucket.acervo_bucket == nombre)
        .first()
    )
    if bucket is None:
        raise SystemExit(f"bucket '{nombre}' no esta registrado en acervo.buckets")
    return AcervoClient.for_bucket(bucket)


def _estado(cliente: AcervoClient, nombre: str) -> dict:
    try:
        versionado = cliente.client.get_bucket_versioning(nombre).status
    except Exception as exc:
        versionado = f"error: {exc}"
    try:
        config = cliente.client.get_bucket_lifecycle(nombre)
        reglas = [r.rule_id for r in config.rules] if config else []
    except Exception:
        reglas = []
    return {"bucket": nombre, "versionado": versionado, "reglas": reglas}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bucket", help="nombre del bucket en Acervo (p. ej. sieej)")
    parser.add_argument(
        "--dias",
        type=int,
        default=90,
        help="dias que sobrevive una version no vigente (default: 90)",
    )
    parser.add_argument(
        "--versiones",
        type=int,
        default=5,
        help="maximo de versiones no vigentes a conservar (default: 5)",
    )
    parser.add_argument(
        "--estado",
        action="store_true",
        help="solo reporta la configuracion actual",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        cliente = _cliente(db, args.bucket)

        if args.estado:
            print(json.dumps(_estado(cliente, args.bucket), ensure_ascii=False))
            return 0

        cliente.client.set_bucket_versioning(
            args.bucket, VersioningConfig(ENABLED)
        )
        cliente.client.set_bucket_lifecycle(
            args.bucket,
            LifecycleConfig(
                [
                    Rule(
                        ENABLED,
                        rule_id=REGLA_ID,
                        rule_filter=Filter(prefix=""),
                        noncurrent_version_expiration=NoncurrentVersionExpiration(
                            noncurrent_days=args.dias,
                            newer_noncurrent_versions=args.versiones,
                        ),
                    )
                ]
            ),
        )
        resultado = _estado(cliente, args.bucket)
        resultado["retencion_dias"] = args.dias
        resultado["versiones_conservadas"] = args.versiones
        print(json.dumps(resultado, ensure_ascii=False))
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
