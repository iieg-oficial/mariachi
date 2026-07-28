from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "identidad"

GRUPOS_TOKEN = (
    "color",
    "tipografia",
    "espaciado",
    "radio",
    "sombra",
    "breakpoint",
    "dataviz",
)


class Marca(Base):
    __tablename__ = "marcas"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    activa = Column(Boolean, default=True, nullable=False, server_default="true")
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    tokens = relationship(
        "MarcaToken",
        back_populates="marca",
        cascade="all, delete-orphan",
    )
    campos = relationship(
        "MarcaCampo",
        back_populates="marca",
        cascade="all, delete-orphan",
    )
    fuentes = relationship(
        "MarcaFuente",
        back_populates="marca",
        cascade="all, delete-orphan",
    )


class MarcaToken(Base):
    __tablename__ = "tokens"
    __table_args__ = (
        UniqueConstraint("marca_id", "grupo", "clave", name="uq_identidad_token"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    marca_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.marcas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    grupo = Column(String(30), nullable=False, index=True)
    clave = Column(String(100), nullable=False)
    tipo = Column(String(30), nullable=False)
    valor = Column(JSONB, nullable=False)
    descripcion = Column(Text, nullable=True)
    orden = Column(Integer, default=0, nullable=False, server_default="0")

    marca = relationship("Marca", back_populates="tokens")


class MarcaCampo(Base):
    __tablename__ = "campos"
    __table_args__ = (
        UniqueConstraint("marca_id", "clave", name="uq_identidad_campo"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    marca_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.marcas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    clave = Column(String(100), nullable=False)
    valor = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    marca = relationship("Marca", back_populates="campos")


class MarcaFuente(Base):
    __tablename__ = "fuentes"
    __table_args__ = (
        UniqueConstraint("marca_id", "familia", name="uq_identidad_fuente"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    marca_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.marcas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    familia = Column(String(100), nullable=False)
    formato = Column(String(30), nullable=False)
    base_url = Column(Text, nullable=True)
    faces = Column(JSONB, nullable=False, server_default="[]")
    orden = Column(Integer, default=0, nullable=False, server_default="0")

    marca = relationship("Marca", back_populates="fuentes")
