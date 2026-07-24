from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "sieej"


class FormularioPeriodo(Base):
    """Ventana de captura materializada de un formulario periodico.

    Cada fila es un periodo concreto (p. ej. `2026-01`) con su ventana
    `[apertura, cierre)`. El motor `periodos_service` las crea por adelantado y
    transiciona su `estado`. Un `EnvioFormulario` periodico apunta al periodo en
    que se capturo, lo que permite un envio por usuario y periodo."""

    __tablename__ = "formulario_periodo"
    __table_args__ = (
        UniqueConstraint(
            "formulario_id", "clave", name="uq_formulario_periodo_clave"
        ),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    formulario_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.formulario.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    clave = Column(String(32), nullable=False)
    apertura = Column(DateTime(timezone=True), nullable=False)
    cierre = Column(DateTime(timezone=True), nullable=False)
    estado = Column(
        Enum(
            "programado",
            "abierto",
            "cerrado",
            name="sieej_periodo_estado",
            schema=SCHEMA,
        ),
        nullable=False,
        default="programado",
        index=True,
    )
    notificado_apertura_en = Column(DateTime(timezone=True), nullable=True)
    notificado_faltantes_en = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    formulario = relationship("Formulario", lazy="select")
