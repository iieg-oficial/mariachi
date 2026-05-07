from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import cast, func
from sqlalchemy.orm import Session
from sqlalchemy.types import Date

from app.api.deps import get_db
from app.core.time import utcnow
from app.models.direccion_organizacional import DireccionOrganizacional
from app.models.reporte import Reporte
from app.models.reporte_tipo import ReporteTipo

router = APIRouter(prefix="/colibri/stats", tags=["colibri stats"])


@router.get("")
async def obtener_stats(
    db: Session = Depends(get_db),
    source_app: str | None = Query(default=None),
    days: int = Query(default=30, ge=1, le=365),
    top_n: int = Query(default=10, ge=1, le=50),
):
    base_query = db.query(Reporte)
    if source_app:
        base_query = base_query.filter(Reporte.source_app == source_app)

    desde = utcnow() - timedelta(days=days)

    total = base_query.count()

    por_estado_rows = (
        base_query.with_entities(Reporte.estado, func.count(Reporte.id))
        .group_by(Reporte.estado)
        .all()
    )
    por_estado = {estado: count for estado, count in por_estado_rows}
    por_estado_full = {
        "nuevo": por_estado.get("nuevo", 0),
        "en_revision": por_estado.get("en_revision", 0),
        "resuelto": por_estado.get("resuelto", 0),
        "descartado": por_estado.get("descartado", 0),
    }

    por_tipo_rows = (
        base_query.with_entities(Reporte.tipo, func.count(Reporte.id))
        .group_by(Reporte.tipo)
        .order_by(func.count(Reporte.id).desc())
        .all()
    )
    tipos_lookup = {
        t.slug: {"label": t.label, "color": t.color}
        for t in db.query(ReporteTipo).all()
    }
    por_tipo = [
        {
            "slug": slug,
            "label": tipos_lookup.get(slug, {}).get("label", slug),
            "color": tipos_lookup.get(slug, {}).get("color", "default"),
            "count": count,
        }
        for slug, count in por_tipo_rows
    ]

    por_app_rows = (
        base_query.with_entities(Reporte.source_app, func.count(Reporte.id))
        .group_by(Reporte.source_app)
        .order_by(func.count(Reporte.id).desc())
        .all()
    )
    por_app = [{"sourceApp": app, "count": count} for app, count in por_app_rows]

    por_direccion_rows = (
        base_query.join(
            DireccionOrganizacional,
            DireccionOrganizacional.id == Reporte.direccion_id,
            isouter=False,
        )
        .with_entities(
            DireccionOrganizacional.id,
            DireccionOrganizacional.nombre,
            DireccionOrganizacional.siglas,
            func.count(Reporte.id),
        )
        .group_by(
            DireccionOrganizacional.id,
            DireccionOrganizacional.nombre,
            DireccionOrganizacional.siglas,
        )
        .order_by(func.count(Reporte.id).desc())
        .all()
    )
    por_direccion = [
        {
            "id": did,
            "nombre": nombre,
            "siglas": siglas,
            "count": count,
        }
        for did, nombre, siglas, count in por_direccion_rows
    ]
    sin_direccion_count = base_query.filter(Reporte.direccion_id.is_(None)).count()

    por_dia_rows = (
        base_query.filter(Reporte.creado_en >= desde)
        .with_entities(
            cast(Reporte.creado_en, Date).label("fecha"),
            func.count(Reporte.id),
        )
        .group_by("fecha")
        .order_by("fecha")
        .all()
    )
    por_dia = [
        {"fecha": fecha.isoformat(), "count": count}
        for fecha, count in por_dia_rows
    ]

    top_rutas_rows = (
        base_query.filter(Reporte.source_route.isnot(None))
        .with_entities(Reporte.source_route, func.count(Reporte.id))
        .group_by(Reporte.source_route)
        .order_by(func.count(Reporte.id).desc())
        .limit(top_n)
        .all()
    )
    top_rutas = [
        {"sourceRoute": ruta, "count": count}
        for ruta, count in top_rutas_rows
    ]

    resolved_query = base_query.filter(Reporte.estado == "resuelto")
    avg_seconds = (
        resolved_query.with_entities(
            func.avg(
                func.extract("epoch", Reporte.actualizado_en - Reporte.creado_en)
            )
        ).scalar()
    )
    tiempo_resolucion_promedio_horas = (
        round(float(avg_seconds) / 3600.0, 2) if avg_seconds is not None else None
    )

    nuevos_ultimo_dia = (
        base_query.filter(Reporte.creado_en >= utcnow() - timedelta(days=1))
        .filter(Reporte.estado == "nuevo")
        .count()
    )

    pendientes = por_estado_full["nuevo"] + por_estado_full["en_revision"]
    porcentaje_resueltos = (
        round((por_estado_full["resuelto"] / total) * 100, 1) if total > 0 else 0.0
    )

    return {
        "total": total,
        "ventanaDias": days,
        "porEstado": por_estado_full,
        "porTipo": por_tipo,
        "porApp": por_app,
        "porDireccion": por_direccion,
        "sinDireccionCount": sin_direccion_count,
        "porDia": por_dia,
        "topRutas": top_rutas,
        "tiempoResolucionPromedioHoras": tiempo_resolucion_promedio_horas,
        "nuevosUltimoDia": nuevos_ultimo_dia,
        "pendientes": pendientes,
        "porcentajeResueltos": porcentaje_resueltos,
    }
