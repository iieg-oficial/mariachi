from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import datetime

from app.services.geoserver_client import GeoServerError
from app.services.mosaic_client import MosaicClient
from app.services.mosaic_service import (
    MOSAIC_TYPE,
    MosaicError,
    classify_files,
    list_mosaics,
    normalize_store_path,
)

DATE_FORMATS: list[tuple[str, str, str]] = [
    ("yyyy-MM-dd", r"[0-9]{4}-[0-9]{2}-[0-9]{2}", "capa_2025-06-01.tif"),
    ("yyyyMMdd", r"[0-9]{8}", "capa_20250601.tif"),
    ("yyyy-MM", r"[0-9]{4}-[0-9]{2}", "capa_2025-06.tif"),
    ("yyyy_MM", r"[0-9]{4}_[0-9]{2}", "capa_2025_06.tif"),
    ("yyyyMM", r"[0-9]{6}", "capa_202506.tif"),
    ("yyyy", r"[0-9]{4}", "capa_2025.tif"),
]
_PATTERNS = {fmt: pattern for fmt, pattern, _ in DATE_FORMATS}
_JAVA_TO_PY = (("yyyy", "%Y"), ("MM", "%m"), ("dd", "%d"))

ROOTS = ("geoserver-raster/", "workspaces/")
_SEGMENT_RE = re.compile(r"^[A-Za-z0-9._-]+$")
_STORE_RE = re.compile(r"^[A-Za-z0-9_-]+$")

INDEXER_PROPERTIES = (
    "TimeAttribute=ingestion\n"
    "Schema=*the_geom:Polygon,location:String,ingestion:java.util.Date\n"
    "PropertyCollectors=TimestampFileNameExtractorSPI[timeregex](ingestion)\n"
)

TIME_ENTRY = (
    '<entry key="time"><dimensionInfo><enabled>true</enabled>'
    "<presentation>LIST</presentation><units>ISO8601</units>"
    "<defaultValue><strategy>MAXIMUM</strategy></defaultValue>"
    "</dimensionInfo></entry>"
)


def time_regex(fmt: str) -> str:
    return f".*({_PATTERNS[fmt]})$"


def timeregex_properties(fmt: str) -> str:
    return f"regex={time_regex(fmt)},format={fmt}\n"


def _python_format(fmt: str) -> str:
    result = fmt
    for java, py in _JAVA_TO_PY:
        result = result.replace(java, py)
    return result


def extract_date(name: str, fmt: str) -> str | None:
    stem = name.rsplit(".", 1)[0]
    match = re.match(time_regex(fmt), stem)
    if not match:
        return None
    try:
        return datetime.strptime(match.group(1), _python_format(fmt)).date().isoformat()
    except ValueError:
        return None


def suggest_format(names: list[str]) -> str | None:
    if not names:
        return None
    for fmt, _, _ in DATE_FORMATS:
        if all(extract_date(n, fmt) for n in names):
            return fmt
    return None


def parse_timeregex(text: str) -> str | None:
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("regex="):
            continue
        for part in stripped.split(","):
            key, _, value = part.partition("=")
            if key.strip() == "format" and value.strip() in _PATTERNS:
                return value.strip()
    return None


def validate_folder(path: str) -> tuple[str, str]:
    clean = (path or "").strip().strip("/")
    if ".." in clean or not clean.startswith(ROOTS):
        raise MosaicError("La carpeta tiene que estar en geoserver-raster/ o en un workspace")
    segments = clean.split("/")
    if len(segments) < 2 or not all(_SEGMENT_RE.match(s) for s in segments):
        raise MosaicError("Ruta de carpeta invalida")
    store = segments[-1]
    if not _STORE_RE.match(store):
        raise MosaicError(
            "El nombre de la carpeta es el de la capa: solo letras, numeros, guion y guion bajo"
        )
    return clean, store


def _mosaic_at(client: MosaicClient, path: str) -> dict | None:
    return next((m for m in list_mosaics(client) if m["path"] == path), None)


def inspect_folder(client: MosaicClient, path: str) -> dict:
    clean, store = validate_folder(path)
    files = client.list_resource_files(clean)
    rasters = sorted(classify_files(files, store).data)
    return {
        "path": clean,
        "store": store,
        "rasters": rasters,
        "has_properties": {
            "indexer": "indexer.properties" in files,
            "timeregex": "timeregex.properties" in files,
        },
        "mosaic": _mosaic_at(client, clean),
        "formats": [
            {
                "format": fmt,
                "example": example,
                "dates": {name: extract_date(name, fmt) for name in rasters},
            }
            for fmt, _, example in DATE_FORMATS
        ],
        "suggested_format": suggest_format(rasters),
    }


def _absolute(data_dir: str, path: str) -> str:
    return f"{data_dir.rstrip('/')}/{path}"


def _drop_index(client: MosaicClient, path: str, store: str) -> list[str]:
    stale = classify_files(client.list_resource_files(path), store).index
    for name in stale:
        client.delete_resource(f"{path}/{name}")
    return stale


def _rollback(client: MosaicClient, workspace: str, path: str, store: str) -> None:
    try:
        client.delete_coveragestore(workspace, store)
    except GeoServerError:
        pass
    try:
        _drop_index(client, path, store)
    except GeoServerError:
        pass


def publish_mosaic(
    client: MosaicClient, workspace: str, path: str, fmt: str, data_dir: str
) -> dict:
    clean, store = validate_folder(path)
    if fmt not in _PATTERNS:
        raise MosaicError(f"Formato de fecha no soportado: {fmt}")
    if workspace not in client.list_workspaces():
        raise MosaicError(f"El workspace {workspace} no existe en GeoServer")
    if client.coveragestore_exists(workspace, store) or client.layer_exists(workspace, store):
        raise MosaicError(f"Ya existe {workspace}:{store} en GeoServer")
    taken = _mosaic_at(client, clean)
    if taken:
        raise MosaicError(
            f"La carpeta ya esta publicada como {taken['workspace']}:{taken['store']}"
        )

    rasters = classify_files(client.list_resource_files(clean), store).data
    if not rasters:
        raise MosaicError("La carpeta no tiene .tif que publicar")
    unmatched = [name for name in rasters if not extract_date(name, fmt)]
    if unmatched:
        sample = ", ".join(sorted(unmatched)[:5])
        raise MosaicError(f"{len(unmatched)} archivo(s) sin fecha {fmt} en el nombre: {sample}")

    stale = _drop_index(client, clean, store)
    client.put_resource(f"{clean}/indexer.properties", INDEXER_PROPERTIES.encode("utf-8"))
    client.put_resource(f"{clean}/timeregex.properties", timeregex_properties(fmt).encode("utf-8"))

    try:
        client.create_external_mosaic(workspace, store, _absolute(data_dir, clean))
        client.set_coveragestore_url(workspace, store, f"file:{clean}")
        coverage = enable_time(client, workspace, store)
    except GeoServerError as exc:
        _rollback(client, workspace, clean, store)
        raise MosaicError(f"No se pudo publicar, se deshizo lo creado: {exc}")

    dates = _granule_dates(client.list_granules(workspace, store, coverage))
    return {
        "workspace": workspace,
        "store": store,
        "layer": coverage,
        "path": clean,
        "format": fmt,
        "stale_index_removed": stale,
        "rasters": len(rasters),
        "periods": len(dates),
        "first": dates[0] if dates else None,
        "last": dates[-1] if dates else None,
        "advertised": client.advertises_time(workspace, coverage),
    }


def _coverage_name(client: MosaicClient, workspace: str, store: str) -> str:
    coverages = client.list_coverages(workspace, store)
    if not coverages:
        raise MosaicError(f"{workspace}:{store} no tiene coverage publicado")
    return coverages[0]


def _time_entry(root: ET.Element) -> ET.Element | None:
    metadata = root.find("metadata")
    if metadata is None:
        return None
    return next((e for e in metadata.findall("entry") if e.get("key") == "time"), None)


def is_time_enabled(xml: str) -> bool:
    entry = _time_entry(ET.fromstring(xml))
    if entry is None:
        return False
    return (entry.findtext("dimensionInfo/enabled") or "").strip() == "true"


def enable_time(client: MosaicClient, workspace: str, store: str) -> str:
    coverage = _coverage_name(client, workspace, store)
    root = ET.fromstring(client.get_coverage_xml(workspace, store, coverage))
    metadata = root.find("metadata")
    if metadata is None:
        metadata = ET.SubElement(root, "metadata")
    current = _time_entry(root)
    if current is not None:
        metadata.remove(current)
    metadata.append(ET.fromstring(TIME_ENTRY))
    client.put_coverage_xml(workspace, store, coverage, ET.tostring(root, encoding="unicode"))
    return coverage


def _granule_dates(granules: list[dict]) -> list[str]:
    return sorted({str(g["ingestion"])[:10] for g in granules if g.get("ingestion")})


def _granule_names(granules: list[dict]) -> set[str]:
    return {str(g.get("location", "")).rsplit("/", 1)[-1] for g in granules if g.get("location")}


def _managed_store(client: MosaicClient, workspace: str, store: str) -> str:
    detail = client.get_coveragestore(workspace, store)
    if str(detail.get("type", "")).lower() != MOSAIC_TYPE:
        raise MosaicError(f"{workspace}:{store} no es un ImageMosaic")
    path = normalize_store_path(detail.get("url"))
    if not path:
        raise MosaicError("La carpeta del mosaico es una ruta absoluta: no se administra desde aqui")
    return path


def mosaic_status(client: MosaicClient, workspace: str, store: str) -> dict:
    path = _managed_store(client, workspace, store)
    coverage = _coverage_name(client, workspace, store)
    granules = client.list_granules(workspace, store, coverage)
    indexed = _granule_names(granules)
    rasters = set(classify_files(client.list_resource_files(path), path.rsplit("/", 1)[-1]).data)
    dates = _granule_dates(granules)
    return {
        "workspace": workspace,
        "store": store,
        "layer": coverage,
        "path": path,
        "time_enabled": is_time_enabled(client.get_coverage_xml(workspace, store, coverage)),
        "advertised": client.advertises_time(workspace, coverage),
        "granules": len(granules),
        "undated": sum(1 for g in granules if not g.get("ingestion")),
        "periods": len(dates),
        "first": dates[0] if dates else None,
        "last": dates[-1] if dates else None,
        "pending": sorted(rasters - indexed),
        "missing": sorted(indexed - rasters),
    }


def harvest_new(client: MosaicClient, workspace: str, store: str, data_dir: str) -> dict:
    status = mosaic_status(client, workspace, store)
    pending = status["pending"]
    if not pending:
        raise MosaicError("No hay archivos nuevos: todos los .tif ya estan en el indice")

    path = status["path"]
    fmt = None
    try:
        fmt = parse_timeregex(client.get_resource(f"{path}/timeregex.properties").decode("utf-8"))
    except GeoServerError:
        fmt = None
    if fmt:
        unmatched = [n for n in pending if not extract_date(n, fmt)]
        if unmatched:
            raise MosaicError(
                f"{len(unmatched)} archivo(s) sin fecha {fmt} en el nombre: {', '.join(unmatched[:5])}"
            )

    harvested: list[str] = []
    failed: list[dict] = []
    for name in pending:
        try:
            client.harvest_granule(workspace, store, _absolute(data_dir, f"{path}/{name}"))
            harvested.append(name)
        except GeoServerError as exc:
            failed.append({"name": name, "error": str(exc)})
    return {"workspace": workspace, "store": store, "harvested": harvested, "failed": failed}
