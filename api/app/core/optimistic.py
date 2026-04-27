from datetime import datetime

from fastapi import HTTPException, status

DEFAULT_TOLERANCE_SECONDS = 2.0


def check_concurrent_edit(
    db_timestamp: datetime,
    expected_timestamp: datetime | None,
    detail: str,
    tolerance_seconds: float = DEFAULT_TOLERANCE_SECONDS,
) -> None:
    if expected_timestamp is None:
        return
    db_ts = db_timestamp.replace(tzinfo=None)
    req_ts = expected_timestamp.replace(tzinfo=None)
    if abs((db_ts - req_ts).total_seconds()) > tolerance_seconds:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )
