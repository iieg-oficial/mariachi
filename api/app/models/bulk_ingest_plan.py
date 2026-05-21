from sqlalchemy import CheckConstraint, Column, DateTime, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database import DataEngineBase


class BulkIngestPlan(DataEngineBase):
    __tablename__ = 'bulk_ingest_plans'
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','applied','cancelled','expired')",
            name='ck_bulk_ingest_plans_status',
        ),
        {'schema': 'mapalab'},
    )

    id = Column(UUID(as_uuid=True), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=text('NOW()'), nullable=False)
    created_by = Column(String(255), nullable=False)
    dependencia = Column(String(100), nullable=False)
    source_filename = Column(String(500), nullable=False)
    source_object_key = Column(String(500))
    status = Column(String(20), nullable=False, server_default=text("'pending'"))
    plan_json = Column(JSONB, nullable=False)
    column_mapping = Column(JSONB)
    applied_at = Column(DateTime(timezone=True))
    applied_by = Column(String(255))
    expires_at = Column(DateTime(timezone=True), nullable=False)
