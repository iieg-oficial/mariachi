from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class PublicationRequest(Base):
    __tablename__ = "publication_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    draft_id = Column(Integer, ForeignKey("drafts.id"), nullable=False)
    status = Column(
        Enum("pending", "approved", "rejected", name="publication_status"),
        default="pending",
        nullable=False,
        index=True
    )
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)

    user = relationship("Usuario", foreign_keys=[user_id])
    reviewer = relationship("Usuario", foreign_keys=[reviewed_by])
    draft = relationship("Draft")
