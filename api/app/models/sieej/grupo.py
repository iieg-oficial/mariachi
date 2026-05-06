from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "sieej"


usuario_grupo = Table(
    "usuario_grupo",
    Base.metadata,
    Column(
        "usuario_id",
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "grupo_id",
        Integer,
        ForeignKey(f"{SCHEMA}.grupo.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    schema=SCHEMA,
)


formulario_grupo = Table(
    "formulario_grupo",
    Base.metadata,
    Column(
        "formulario_id",
        Integer,
        ForeignKey(f"{SCHEMA}.formulario.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "grupo_id",
        Integer,
        ForeignKey(f"{SCHEMA}.grupo.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    schema=SCHEMA,
)


formulario_usuario = Table(
    "formulario_usuario",
    Base.metadata,
    Column(
        "formulario_id",
        Integer,
        ForeignKey(f"{SCHEMA}.formulario.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "usuario_id",
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    schema=SCHEMA,
)


class Grupo(Base):
    __tablename__ = "grupo"
    __table_args__ = (
        UniqueConstraint("nombre", name="uq_grupo_nombre"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(128), nullable=False, unique=True)
    descripcion = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    usuarios = relationship(
        "Usuario",
        secondary=usuario_grupo,
        lazy="select",
    )
