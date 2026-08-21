from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "sieej"


class Formulario(Base):
    __tablename__ = "formulario"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_formulario_slug"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(128), nullable=False, index=True, unique=True)
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    definicion = Column(JSON, nullable=False)
    estado = Column(
        Enum(
            "borrador",
            "activo",
            "cerrado",
            name="sieej_formulario_estado",
            schema=SCHEMA,
        ),
        nullable=False,
        default="borrador",
        index=True,
    )
    vigencia_inicio = Column(DateTime(timezone=True), nullable=True)
    vigencia_fin = Column(DateTime(timezone=True), nullable=True)
    periodicidad = Column(JSON, nullable=True)
    publico = Column(Boolean, nullable=False, default=False)
    colaborativo = Column(Boolean, nullable=False, default=False)
    version = Column(Integer, nullable=False, default=1)
    creado_por_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    actualizado_por_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    creado_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    actualizado_en = Column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    creado_por = relationship("Usuario", foreign_keys=[creado_por_id], lazy="select")
    actualizado_por = relationship(
        "Usuario", foreign_keys=[actualizado_por_id], lazy="select"
    )
    grupos = relationship(
        "Grupo",
        secondary=f"{SCHEMA}.formulario_grupo",
        lazy="select",
    )
    usuarios_asignados = relationship(
        "Usuario",
        secondary=f"{SCHEMA}.formulario_usuario",
        lazy="select",
    )


class FormularioVersion(Base):
    """Historial de definiciones: la fila `version=N` guarda la definicion
    tal como quedo al final de esa version, archivada al publicarse el
    cambio `rompe` que creo la version N+1. La vigente vive en
    `Formulario.definicion`."""

    __tablename__ = "formulario_version"
    __table_args__ = (
        UniqueConstraint(
            "formulario_id", "version", name="uq_formulario_version"
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
    version = Column(Integer, nullable=False)
    definicion = Column(JSON, nullable=False)
    archivado_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    actor_usuario_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )

    formulario = relationship("Formulario", lazy="select")
    actor = relationship(
        "Usuario", foreign_keys=[actor_usuario_id], lazy="select"
    )
