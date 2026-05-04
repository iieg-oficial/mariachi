from sqlalchemy import JSON, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class Reporte(Base):
    __tablename__ = "reportes"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(
        Enum(
            "problema",
            "solicitud",
            "sugerencia",
            "duda",
            "datos_incorrectos",
            "bug",
            name="reporte_tipo",
        ),
        nullable=False,
    )
    mensaje = Column(Text, nullable=False)
    email_contacto = Column(String(320), nullable=True)
    source_app = Column(String(50), nullable=False, index=True)
    source_route = Column(String(500), nullable=True)
    source_context = Column(JSON, default=dict, nullable=False)
    screenshot_bucket_id = Column(
        Integer, ForeignKey("media_buckets.id"), nullable=True, index=True
    )
    screenshot_object_path = Column(String(500), nullable=True)
    estado = Column(
        Enum(
            "nuevo",
            "en_revision",
            "resuelto",
            "descartado",
            name="reporte_estado",
        ),
        nullable=False,
        default="nuevo",
        index=True,
    )
    nota_interna = Column(Text, nullable=True)
    atendido_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    creado_en = Column(DateTime, nullable=False, default=utcnow, index=True)
    actualizado_en = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    screenshot_bucket = relationship("MediaBucket", lazy="select")
    atendido_por = relationship(
        "Usuario", foreign_keys=[atendido_por_id], lazy="select"
    )
