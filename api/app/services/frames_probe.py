from __future__ import annotations

import hashlib
import re
import socket
import uuid
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

import httpx

from app.services.frames_client import FramesError

_RETO = re.compile(r'(\w+)=(?:"([^"]*)"|([^,\s]+))')
_CAMPOS_CANAL = ("id", "name", "ipAddress", "online")


def _md5(texto: str) -> str:
    return hashlib.md5(texto.encode("utf-8")).hexdigest()


def _parsear_reto(cabecera: str) -> dict[str, str]:
    reto: dict[str, str] = {}
    for clave, con_comillas, sin_comillas in _RETO.findall(cabecera):
        reto[clave] = con_comillas or sin_comillas
    return reto


def _digest(usuario: str, clave: str, metodo: str, uri: str, reto: dict[str, str]) -> str:
    realm = reto.get("realm", "")
    nonce = reto.get("nonce", "")
    ha1 = _md5(f"{usuario}:{realm}:{clave}")
    ha2 = _md5(f"{metodo}:{uri}")
    partes = [f'username="{usuario}"', f'realm="{realm}"', f'nonce="{nonce}"', f'uri="{uri}"']
    if reto.get("qop"):
        nc = "00000001"
        cnonce = uuid.uuid4().hex[:16]
        respuesta = _md5(f"{ha1}:{nonce}:{nc}:{cnonce}:auth:{ha2}")
        partes += ["qop=auth", f"nc={nc}", f'cnonce="{cnonce}"', f'response="{respuesta}"']
    else:
        partes.append(f'response="{_md5(f"{ha1}:{nonce}:{ha2}")}"')
    return "Digest " + ", ".join(partes)


def _solicitar(sock: socket.socket, lineas: list[str]) -> str:
    sock.sendall(("\r\n".join(lineas) + "\r\n\r\n").encode("utf-8"))
    datos = b""
    while b"\r\n\r\n" not in datos:
        trozo = sock.recv(4096)
        if not trozo:
            break
        datos += trozo
    return datos.decode("latin-1", errors="replace")


def _estado(respuesta: str) -> int:
    primera = respuesta.split("\r\n", 1)[0]
    partes = primera.split(" ")
    return int(partes[1]) if len(partes) > 1 and partes[1].isdigit() else 0


def _cabecera(respuesta: str, nombre: str) -> str:
    patron = re.compile(rf"^{nombre}:\s*(.+)$", re.IGNORECASE | re.MULTILINE)
    encontrado = patron.search(respuesta)
    return encontrado.group(1).strip() if encontrado else ""


def _interpretar(codigo: int) -> tuple[bool, str]:
    if codigo == 200:
        return True, "La camara respondio y entrega video."
    if codigo == 401:
        return False, "Usuario o contrasena incorrectos para esta camara."
    if codigo == 404:
        return False, "El canal o la ruta no existen en ese equipo."
    if codigo == 0:
        return False, "Respuesta no reconocida: el puerto podria no ser RTSP."
    return False, f"La camara respondio con un error (RTSP {codigo})."


def probar_rtsp(url: str, timeout: float = 6.0) -> tuple[bool, str]:
    partes = urlparse(url)
    if partes.scheme != "rtsp" or not partes.hostname:
        return False, "La URL debe empezar con rtsp:// y tener un host."
    puerto = partes.port or 554
    camino = partes.path or "/"
    if partes.query:
        camino = f"{camino}?{partes.query}"
    uri = f"rtsp://{partes.hostname}:{puerto}{camino}"
    metodo = "DESCRIBE"
    base = [f"{metodo} {uri} RTSP/1.0", "CSeq: 1", "Accept: application/sdp", "User-Agent: mariachi"]
    try:
        with socket.create_connection((partes.hostname, puerto), timeout=timeout) as sock:
            sock.settimeout(timeout)
            respuesta = _solicitar(sock, base)
            codigo = _estado(respuesta)
            if codigo == 401:
                reto = _cabecera(respuesta, "WWW-Authenticate")
                if "Digest" not in reto:
                    return False, "La camara pide una autenticacion no soportada."
                auth = _digest(
                    partes.username or "", partes.password or "", metodo, uri, _parsear_reto(reto)
                )
                con_auth = [
                    f"{metodo} {uri} RTSP/1.0",
                    "CSeq: 2",
                    "Accept: application/sdp",
                    f"Authorization: {auth}",
                    "User-Agent: mariachi",
                ]
                codigo = _estado(_solicitar(sock, con_auth))
            return _interpretar(codigo)
    except (socket.timeout, TimeoutError):
        return False, "No respondio a tiempo: revisa el puerto RTSP (554) y que la IP sea alcanzable."
    except OSError as exc:
        return False, f"No se pudo conectar: {str(exc)[:120]}"


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def descubrir_nvr(
    host: str, usuario: str, contrasena: str, puerto: int = 80, timeout: float = 8.0
) -> list[dict[str, object]]:
    url = f"http://{host}:{puerto}/ISAPI/ContentMgmt/InputProxy/channels"
    try:
        respuesta = httpx.get(url, auth=httpx.DigestAuth(usuario, contrasena), timeout=timeout)
    except httpx.HTTPError as exc:
        raise FramesError(f"No se pudo consultar el NVR: {str(exc)[:160]}") from exc
    if respuesta.status_code == 401:
        raise FramesError("Usuario o contrasena del NVR incorrectos.")
    if respuesta.status_code != 200:
        raise FramesError(f"El NVR respondio HTTP {respuesta.status_code}.")
    try:
        raiz = ET.fromstring(respuesta.text)
    except ET.ParseError as exc:
        raise FramesError(f"El NVR devolvio algo que no es XML: {str(exc)[:120]}") from exc

    canales: list[dict[str, object]] = []
    for canal in (e for e in raiz.iter() if _local(e.tag) == "InputProxyChannel"):
        campos: dict[str, str] = {}
        for sub in canal.iter():
            etiqueta = _local(sub.tag)
            if etiqueta in _CAMPOS_CANAL and sub.text and etiqueta not in campos:
                campos[etiqueta] = sub.text.strip()
        if "id" not in campos:
            continue
        canales.append(
            {
                "canal": int(campos["id"]) if campos["id"].isdigit() else campos["id"],
                "nombre": campos.get("name", ""),
                "ip": campos.get("ipAddress", ""),
                "en_linea": campos.get("online", "").lower() == "true",
            }
        )
    return canales
