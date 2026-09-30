import httpx
from fastapi import HTTPException

from app.core.settings import get_settings

_TIMEOUT_SECONDS = 2.0


async def consultar(path: str) -> dict | list:
    settings = get_settings()
    base = (settings.huachicol_monitor_url or "").rstrip("/")
    if not base:
        raise HTTPException(status_code=503, detail="monitor no configurado")
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            response = await client.get(f"{base}{path}")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code, detail="monitor respondió con error"
        )
    except Exception:
        raise HTTPException(status_code=502, detail="monitor no alcanzable")
