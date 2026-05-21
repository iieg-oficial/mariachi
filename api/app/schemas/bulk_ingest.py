from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas._camel import CamelCaseInput


class BulkIngestColumnPreset(BaseModel):
    slug: str
    label: str
    description: str | None = None
    mapping: dict[str, str]


class BulkIngestStats(BaseModel):
    rows_in_source: int = Field(..., serialization_alias='rowsInSource')
    rows_with_pk: int = Field(..., serialization_alias='rowsWithPk')
    rows_unique: int = Field(..., serialization_alias='rowsUnique')
    rows_missing_pk: int = Field(..., serialization_alias='rowsMissingPk')
    rows_duplicate_pk: int = Field(..., serialization_alias='rowsDuplicatePk')
    inserts: int
    updates: int
    stats_inserts: int = Field(..., serialization_alias='statsInserts')
    stats_updates: int = Field(..., serialization_alias='statsUpdates')

    model_config = ConfigDict(populate_by_name=True)


class BulkIngestFieldDiff(BaseModel):
    column: str
    table: Literal['layer_metadata', 'layer_stats']
    from_value: Any = Field(..., serialization_alias='fromValue')
    to_value: Any = Field(..., serialization_alias='toValue')
    apply: bool = True

    model_config = ConfigDict(populate_by_name=True)


class BulkIngestChange(BaseModel):
    layer_key: str = Field(..., serialization_alias='layerKey')
    op: Literal['insert', 'update']
    metadata_values: dict[str, Any] | None = Field(default=None, serialization_alias='metadataValues')
    stats_values: dict[str, Any] | None = Field(default=None, serialization_alias='statsValues')
    diffs: list[BulkIngestFieldDiff] = Field(default_factory=list)
    apply: bool = True

    model_config = ConfigDict(populate_by_name=True)


class BulkIngestPlanData(BaseModel):
    version: int = 1
    dependencia: str
    source_filename: str = Field(..., serialization_alias='sourceFilename')
    generated_at: datetime = Field(..., serialization_alias='generatedAt')
    stats: BulkIngestStats
    duplicates_skipped: list[str] = Field(default_factory=list, serialization_alias='duplicatesSkipped')
    rows_missing_pk_samples: list[dict[str, Any]] = Field(
        default_factory=list, serialization_alias='rowsMissingPkSamples'
    )
    changes: list[BulkIngestChange]

    model_config = ConfigDict(populate_by_name=True)


class BulkIngestUploadResponse(BaseModel):
    plan_id: UUID = Field(..., serialization_alias='planId')
    expires_at: datetime = Field(..., serialization_alias='expiresAt')
    plan: BulkIngestPlanData
    detected_headers: list[str] = Field(..., serialization_alias='detectedHeaders')
    unknown_headers: list[str] = Field(default_factory=list, serialization_alias='unknownHeaders')
    column_mapping: dict[str, str] = Field(..., serialization_alias='columnMapping')

    model_config = ConfigDict(populate_by_name=True)


class BulkIngestPlanResponse(BaseModel):
    plan_id: UUID = Field(..., serialization_alias='planId')
    created_at: datetime = Field(..., serialization_alias='createdAt')
    created_by: str = Field(..., serialization_alias='createdBy')
    dependencia: str
    source_filename: str = Field(..., serialization_alias='sourceFilename')
    source_object_key: str | None = Field(default=None, serialization_alias='sourceObjectKey')
    status: Literal['pending', 'applied', 'cancelled', 'expired']
    expires_at: datetime = Field(..., serialization_alias='expiresAt')
    applied_at: datetime | None = Field(default=None, serialization_alias='appliedAt')
    applied_by: str | None = Field(default=None, serialization_alias='appliedBy')
    column_mapping: dict[str, str] | None = Field(default=None, serialization_alias='columnMapping')
    plan: BulkIngestPlanData

    model_config = ConfigDict(populate_by_name=True)


class BulkIngestApplySelection(CamelCaseInput):
    layer_keys: list[str] | None = Field(default=None, serialization_alias='layerKeys')

    model_config = ConfigDict(populate_by_name=True)


class BulkIngestApplyResult(BaseModel):
    plan_id: UUID = Field(..., serialization_alias='planId')
    applied_at: datetime = Field(..., serialization_alias='appliedAt')
    applied_by: str = Field(..., serialization_alias='appliedBy')
    metadata_inserts: int = Field(..., serialization_alias='metadataInserts')
    metadata_updates: int = Field(..., serialization_alias='metadataUpdates')
    stats_inserts: int = Field(..., serialization_alias='statsInserts')
    stats_updates: int = Field(..., serialization_alias='statsUpdates')
    skipped: int = 0
    conflicts: list[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)
