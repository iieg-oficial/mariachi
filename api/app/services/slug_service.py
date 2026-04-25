from __future__ import annotations

import re
import unicodedata
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.layer import Layer, LayerAlias

SLUG_PATTERN = re.compile(r"^[a-z0-9-]+$")
MAX_SLUG_LEN = 60


def slugify(text: str) -> str:
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_only.lower()
    lowered = re.sub(r"[^a-z0-9]+", "-", lowered)
    lowered = lowered.strip("-")
    return lowered[:MAX_SLUG_LEN]


def is_valid_slug(slug: str | None) -> bool:
    if not slug:
        return False
    if len(slug) > MAX_SLUG_LEN:
        return False
    return bool(SLUG_PATTERN.match(slug))


def slug_taken(session: Session, slug: str, exclude_layer_id: str | None = None) -> bool:
    q = session.query(Layer.id).filter(Layer.slug == slug)
    if exclude_layer_id:
        q = q.filter(Layer.id != exclude_layer_id)
    if q.first() is not None:
        return True
    if session.query(LayerAlias.alias).filter(LayerAlias.alias == slug).first() is not None:
        return True
    return False


def resolve_collision(session: Session, base: str, exclude_layer_id: str | None = None) -> str:
    if not slug_taken(session, base, exclude_layer_id):
        return base
    suffix = 2
    while True:
        candidate = f"{base[: MAX_SLUG_LEN - len(str(suffix)) - 1]}-{suffix}"
        if not slug_taken(session, candidate, exclude_layer_id):
            return candidate
        suffix += 1


def generate_for_layers(
    session: Session,
    layers: Iterable[Layer],
    overwrite_existing: bool = False,
) -> list[dict]:
    results: list[dict] = []
    for layer in layers:
        if layer.slug and not overwrite_existing:
            results.append({
                "layer_id": layer.id,
                "slug": layer.slug,
                "status": "skipped_existing",
            })
            continue

        base = slugify(layer.label) or slugify(layer.id) or layer.id.lower()
        if not is_valid_slug(base):
            base = "capa"

        final = resolve_collision(session, base, exclude_layer_id=layer.id)
        layer.slug = final
        session.flush()
        status = "collision_resolved" if final != base else "assigned"
        results.append({
            "layer_id": layer.id,
            "slug": final,
            "status": status,
        })
    return results
