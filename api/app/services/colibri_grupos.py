import logging

from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.reporte import Reporte
from app.models.reporte_grupo import ReporteGrupo
from app.services.colibri_fingerprint import compute_fingerprint

logger = logging.getLogger(__name__)

_INSERTS = {"postgresql": postgresql.insert, "sqlite": sqlite.insert}


def asignar_grupo(db: Session, reporte: Reporte) -> None:
    fingerprint = compute_fingerprint(
        tipo=reporte.tipo,
        source_app=reporte.source_app or "",
        source_route=reporte.source_route,
        mensaje=reporte.mensaje or "",
    )
    insert = _INSERTS.get(db.get_bind().dialect.name, postgresql.insert)
    ahora = utcnow()
    stmt = (
        insert(ReporteGrupo)
        .values(
            fingerprint=fingerprint,
            primer_reporte_id=reporte.id,
            ultimo_reporte_id=reporte.id,
            count=1,
            primer_visto=ahora,
            ultimo_visto=ahora,
        )
        .on_conflict_do_update(
            index_elements=[ReporteGrupo.fingerprint],
            set_={
                "count": ReporteGrupo.count + 1,
                "ultimo_reporte_id": reporte.id,
                "ultimo_visto": ahora,
            },
        )
        .returning(ReporteGrupo.id)
    )
    try:
        reporte.grupo_id = db.execute(stmt).scalar_one()
        db.commit()
    except Exception:
        logger.exception("reportes.fingerprint reporte_id=%s", reporte.id)
        db.rollback()
