from typing import Any

from sqlalchemy.orm import Session

from app.services.vine_perfiles import DEPTO, ES_BAJA
from app.services.vine_stats import consultar

NOMBRE = """nullif(trim(concat_ws(' ', coalesce(f.nombre, p.nombre),
                                  coalesce(f.apellidos, p.apellidos))), '')"""


def directorio(db: Session) -> list[dict[str, Any]]:
    sql = f"""
        SELECT id, CASE WHEN nombre = upper(nombre) THEN initcap(nombre) ELSE nombre END
                   AS nombre_completo,
               puesto, area, email, extension, foto_url
        FROM (
            SELECT p.pin AS id,
                   {NOMBRE} AS nombre,
                   nullif(trim(coalesce(f.puesto, p.puesto)), '') AS puesto,
                   nullif(trim({DEPTO}), '') AS area,
                   nullif(trim(coalesce(f.email, p.email)), '') AS email,
                   nullif(trim(f.extension), '') AS extension,
                   coalesce(f.foto_url, u.avatar_url) AS foto_url
            FROM vine.personas p
            LEFT JOIN vine.personas_ficha f ON f.pin = p.pin
            LEFT JOIN public.usuarios u
                   ON lower(u.email) = lower(nullif(trim(coalesce(f.email, p.email)), ''))
            WHERE NOT {ES_BAJA}
        ) t
        WHERE nombre IS NOT NULL
        ORDER BY nombre_completo
    """
    return consultar(db, sql, {})
