import hashlib
import hmac

from fastapi import Header, HTTPException, status

from app.core.settings import get_settings


def verificar_clave_intranet(x_api_key: str = Header(default="")) -> None:
    esperado = (get_settings().intranet_cliente_sha256 or "").strip().lower()
    recibido = hashlib.sha256(x_api_key.encode()).hexdigest()
    if not esperado or not x_api_key or not hmac.compare_digest(recibido, esperado):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key inválida")
