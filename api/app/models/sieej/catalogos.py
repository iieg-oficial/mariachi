from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base

SCHEMA = "sieej"


class Catalogo(Base):
    __tablename__ = "catalogo"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(64), unique=True, index=True, nullable=False)
    label = Column(String(255), nullable=False)

    opciones = relationship(
        "CatalogoOpcion",
        back_populates="catalogo",
        cascade="all, delete-orphan",
        order_by="CatalogoOpcion.id",
    )


class CatalogoOpcion(Base):
    __tablename__ = "catalogo_opcion"
    __table_args__ = (
        UniqueConstraint("catalogo_id", "value", name="uq_catalogo_opcion_value"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    catalogo_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.catalogo.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    value = Column(String, nullable=False)

    catalogo = relationship("Catalogo", back_populates="opciones")
