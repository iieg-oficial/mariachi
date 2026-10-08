from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.services.geoserver_client import GeoServerError
from app.services.mosaic_client import MosaicClient

MOSAIC_TYPE = "imagemosaic"
INDEX_EXTENSIONS = {"dbf", "shp", "shx", "qix", "fix", "prj", "properties"}
PROTECTED_FILES = {"indexer.properties", "timeregex.properties"}
SAMPLE_IMAGE = "sample_image.dat"
DATA_EXTENSIONS = {"tif", "tiff"}
BACKUP_ROOT = "backups/mosaic-index"


class MosaicError(Exception):
    pass


@dataclass
class ClassifiedFiles:
    index: list[str] = field(default_factory=list)
    protected: list[str] = field(default_factory=list)
    data: list[str] = field(default_factory=list)
    unknown: list[str] = field(default_factory=list)


def normalize_store_path(url: str | None) -> str | None:
    if not url:
        return None
    raw = url.strip()
    if raw.startswith("file:"):
        raw = raw[len("file:") :]
    if raw.startswith("/"):
        return None
    return raw.strip("/") or None


def resolve_index_name(properties_text: str | None, folder_name: str) -> str:
    if not properties_text:
        return folder_name
    declared: dict[str, str] = {}
    for line in properties_text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        key, sep, value = stripped.partition("=")
        if sep:
            declared[key.strip()] = value.strip()
    for key in ("TypeName", "Name"):
        value = declared.get(key)
        if value:
            return value
    return folder_name


def classify_files(files: list[str], index_name: str) -> ClassifiedFiles:
    result = ClassifiedFiles()
    for name in files:
        if name in PROTECTED_FILES:
            result.protected.append(name)
            continue
        if name == SAMPLE_IMAGE:
            result.index.append(name)
            continue
        stem, sep, ext = name.rpartition(".")
        ext = ext.lower() if sep else ""
        if sep and stem == index_name and ext in INDEX_EXTENSIONS:
            result.index.append(name)
            continue
        if ext in DATA_EXTENSIONS:
            result.data.append(name)
            continue
        result.unknown.append(name)
    return result


def list_mosaics(client: MosaicClient) -> list[dict]:
    mosaics: list[dict] = []
    for workspace in client.list_workspaces():
        for store in client.list_coveragestores(workspace):
            try:
                detail = client.get_coveragestore(workspace, store)
            except (GeoServerError, Exception):
                continue
            if str(detail.get("type", "")).lower() != MOSAIC_TYPE:
                continue
            path = normalize_store_path(detail.get("url"))
            mosaics.append({
                "workspace": workspace,
                "store": store,
                "path": path,
                "manageable": path is not None,
            })
    counts = Counter(m["path"] for m in mosaics if m["path"])
    for mosaic in mosaics:
        if mosaic["path"] and counts[mosaic["path"]] > 1:
            mosaic["manageable"] = False
            mosaic["shared_folder"] = True
    return mosaics


def _probe(client: MosaicClient, workspace: str, store: str) -> int | None:
    coverages = client.list_coverages(workspace, store)
    if not coverages:
        return None
    detail = client.get_coverage(workspace, store, coverages[0])
    box = detail.get("nativeBoundingBox") or {}
    srs = detail.get("srs")
    corners = [box.get("minx"), box.get("miny"), box.get("maxx"), box.get("maxy")]
    if not srs or any(v is None for v in corners):
        return None
    bbox = ",".join(str(v) for v in corners)
    size, content_type = client.render_probe(workspace, coverages[0], bbox, srs)
    if "image" not in content_type:
        return None
    return size


def reindex_mosaic(client: MosaicClient, workspace: str, store: str, reset: bool = True) -> dict:
    detail = client.get_coveragestore(workspace, store)
    if str(detail.get("type", "")).lower() != MOSAIC_TYPE:
        raise MosaicError(f"{workspace}:{store} no es un ImageMosaic")

    path = normalize_store_path(detail.get("url"))
    if not path:
        raise MosaicError(
            "La carpeta del mosaico esta fuera del data dir o es una ruta absoluta: "
            "no se puede administrar desde aqui"
        )

    others = [
        m for m in list_mosaics(client)
        if m["path"] == path and not (m["workspace"] == workspace and m["store"] == store)
    ]
    if others:
        raise MosaicError(
            f"Otro coveragestore usa la misma carpeta ({others[0]['workspace']}:{others[0]['store']}): "
            "reindexar aqui afectaria a esa capa"
        )

    folder_name = path.rsplit("/", 1)[-1]
    files = client.list_resource_files(path)
    if not files:
        raise MosaicError(f"La carpeta {path} esta vacia o no existe")

    properties_text = None
    if f"{folder_name}.properties" in files:
        properties_text = client.get_resource(f"{path}/{folder_name}.properties").decode(
            "utf-8", errors="replace"
        )
    index_name = resolve_index_name(properties_text, folder_name)
    classified = classify_files(files, index_name)

    if not classified.index:
        raise MosaicError("La carpeta no tiene indice que reconstruir")
    if not classified.data:
        raise MosaicError("La carpeta no tiene rasters: reindexar dejaria la capa sin datos")

    before = _probe(client, workspace, store)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    backup_dir = f"{BACKUP_ROOT}/{workspace}-{store}-{stamp}"
    saved: list[tuple[str, bytes]] = []
    for name in classified.index:
        content = client.get_resource(f"{path}/{name}")
        client.put_resource(f"{backup_dir}/{name}", content)
        saved.append((name, content))

    for name in classified.index:
        client.delete_resource(f"{path}/{name}")

    if reset:
        client.reset()

    try:
        after = _probe(client, workspace, store)
    except Exception as exc:
        _restore(client, path, saved)
        raise MosaicError(f"El render fallo tras reindexar, se restauro el indice: {exc}")

    if after is None:
        _restore(client, path, saved)
        raise MosaicError("El render no devolvio una imagen tras reindexar, se restauro el indice")

    return {
        "workspace": workspace,
        "store": store,
        "path": path,
        "index_name": index_name,
        "deleted": classified.index,
        "preserved": classified.protected,
        "untouched": classified.unknown,
        "rasters": len(classified.data),
        "backup": backup_dir,
        "render_before": before,
        "render_after": after,
        "reset": reset,
    }


def _restore(client: MosaicClient, path: str, saved: list[tuple[str, bytes]]) -> None:
    for name, content in saved:
        try:
            client.put_resource(f"{path}/{name}", content)
        except GeoServerError:
            continue
