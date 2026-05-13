from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class MapalabApiKeyEmbed(Base):
    __tablename__ = "mapalab_api_keys_embeds"
    __table_args__ = (
        UniqueConstraint("api_key_id", "share_id", name="uq_mapalab_api_keys_embeds_key_share"),
    )

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(
        Integer,
        ForeignKey("mapalab_api_keys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    share_id = Column(String(10), nullable=False, index=True)
    label = Column(String(150), nullable=True)
    creado_por_user_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    creado_en = Column(DateTime, nullable=False, default=utcnow)

    api_key = relationship("MapalabApiKey", back_populates="embeds")
