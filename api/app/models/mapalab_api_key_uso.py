from sqlalchemy import Column, Date, ForeignKey, Integer, PrimaryKeyConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class MapalabApiKeyUsoDiario(Base):
    __tablename__ = "mapalab_api_keys_uso_diario"
    __table_args__ = (
        PrimaryKeyConstraint("api_key_id", "dia", name="pk_mapalab_api_keys_uso_diario"),
    )

    api_key_id = Column(
        Integer,
        ForeignKey("mapalab_api_keys.id", ondelete="CASCADE"),
        nullable=False,
    )
    dia = Column(Date, nullable=False)
    requests = Column(Integer, nullable=False, default=0)
    errores = Column(Integer, nullable=False, default=0)
    bytes_out = Column(Integer, nullable=False, default=0)

    api_key = relationship("MapalabApiKey", back_populates="uso_diario")
