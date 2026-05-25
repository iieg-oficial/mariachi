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
    tipo_id = Column(
        Integer, ForeignKey("reporte_tipos.id"), nullable=True, index=True
    )
    direccion_id = Column(
        Integer, ForeignKey("direcciones_organizacionales.id"), nullable=True, index=True
    )
    source_app_id = Column(
        Integer, ForeignKey("source_apps.id"), nullable=True, index=True
    )
    grupo_id = Column(
        Integer, ForeignKey("reporte_grupos.id"), nullable=True, index=True
    )
    respuestas = Column(JSON, nullable=True)
    mensaje = Column(Text, nullable=False)
    email_contacto = Column(String(320), nullable=True)
    source_app = Column(String(50), nullable=False, index=True)
    source_route = Column(String(500), nullable=True)
    source_context = Column(JSON, default=dict, nullable=False)
    screenshot_bucket_id = Column(
        Integer, ForeignKey("acervo_buckets.id"), nullable=True, index=True
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
    severidad = Column(String(10), nullable=True, index=True)
    prioridad = Column(String(4), nullable=True, index=True)
    duplicado_de = Column(
        Integer, ForeignKey("reportes.id"), nullable=True, index=True
    )
    bloqueado_por = Column(Text, nullable=True)
    sla_at = Column(DateTime, nullable=True)
    nota_interna = Column(Text, nullable=True)
    atendido_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    creado_en = Column(DateTime, nullable=False, default=utcnow, index=True)
    actualizado_en = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    tipo_rel = relationship("ReporteTipo", back_populates="reportes", lazy="select")
    direccion = relationship(
        "DireccionOrganizacional", back_populates="reportes", lazy="select"
    )
    source_app_rel = relationship("SourceApp", back_populates="reportes", lazy="select")
    screenshot_bucket = relationship("AcervoBucket", lazy="select")
    atendido_por = relationship(
        "Usuario", foreign_keys=[atendido_por_id], lazy="select"
    )
