from sqlalchemy import (
    JSON,
    BigInteger,
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


class EnvioFormulario(Base):
    __tablename__ = "envio_formulario"
    __table_args__ = (
        UniqueConstraint("formulario_id", "usuario_id", name="uq_envio_formulario_user"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    formulario_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.formulario.id", ondelete="CASCADE"),
        nullable=False,
    )
    formulario_version = Column(Integer, nullable=False)
    definicion_snapshot = Column(JSON, nullable=False)
    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    estado = Column(
        Enum(
            "en_proceso",
            "enviado",
            "expirado",
            name="sieej_envio_estado",
            schema=SCHEMA,
        ),
        nullable=False,
        default="en_proceso",
        index=True,
    )
    datos = Column(JSON, nullable=False, default=dict)
    paso_actual = Column(Integer, nullable=False, default=0)
    iniciado_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    enviado_en = Column(DateTime(timezone=True), nullable=True)
    expirado_en = Column(DateTime(timezone=True), nullable=True)
    actualizado_en = Column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    formulario = relationship("Formulario", lazy="select")
    usuario = relationship("Usuario", lazy="select")
    archivos = relationship(
        "EnvioArchivo",
        back_populates="envio",
        cascade="all, delete-orphan",
        lazy="select",
    )
    eventos = relationship(
        "EnvioEvento",
        back_populates="envio",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="EnvioEvento.ocurrido_en.desc()",
    )


class EnvioArchivo(Base):
    __tablename__ = "envio_archivo"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    envio_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.envio_formulario.id", ondelete="CASCADE"),
        nullable=False,
    )
    field_path = Column(String(512), nullable=False)
    bucket = Column(String(128), nullable=False)
    object_key = Column(String(512), nullable=False)
    url_publica = Column(String(1024), nullable=True)
    filename_original = Column(String(255), nullable=False)
    mime = Column(String(128), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    subido_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    envio = relationship("EnvioFormulario", back_populates="archivos", lazy="select")


class EnvioEvento(Base):
    __tablename__ = "envio_evento"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    envio_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.envio_formulario.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo = Column(
        Enum(
            "iniciado",
            "guardado",
            "enviado",
            "expirado",
            "reabierto",
            name="sieej_evento_tipo",
            schema=SCHEMA,
        ),
        nullable=False,
    )
    payload = Column(JSON, nullable=True)
    actor_usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    ocurrido_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    envio = relationship("EnvioFormulario", back_populates="eventos", lazy="select")
    actor = relationship("Usuario", lazy="select")
