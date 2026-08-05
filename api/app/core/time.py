from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo("America/Mexico_City")


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def today_local() -> date:
    return datetime.now(LOCAL_TZ).date()


def to_naive_utc(dt: datetime | None) -> datetime | None:
    if dt is not None and dt.tzinfo is not None:
        return dt.astimezone(UTC).replace(tzinfo=None)
    return dt
