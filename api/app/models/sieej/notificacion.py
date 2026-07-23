from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "sieej"


class Notificacion(Base):
    """Bitacora de comunicaciones de formularios periodicos.

    Registra cada aviso emitido: apertura de una ventana y faltantes al cierre.
    Guarda a quien se notifico (`destinatarios`), un `resumen` legible y el
    `payload` con el detalle (fechas de la ventana, conteos, lista de
    faltantes). Alimenta el panel del admin y su export CSV/XLSX."""

    __tablename__ = "notificacion"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    formulario_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.formulario.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    periodo_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.formulario_periodo.id", ondelete="SET NULL"),
        nullable=True,
    )
    tipo = Column(
        Enum(
            "apertura",
            "faltantes",
            name="sieej_notificacion_tipo",
            schema=SCHEMA,
        ),
        nullable=False,
    )
    resumen = Column(Text, nullable=False)
    payload = Column(JSON, nullable=True)
    destinatarios = Column(JSON, nullable=True)
    enviado_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    formulario = relationship("Formulario", lazy="select")
    periodo = relationship("FormularioPeriodo", lazy="select")
