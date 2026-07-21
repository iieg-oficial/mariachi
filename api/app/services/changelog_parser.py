"""Parser del `docs/CHANGELOG.md` (formato Keep a Changelog) a JSON estructurado.

Devuelve cada release como `{version, fecha, secciones: [{titulo, contenido}]}`.
`contenido` es markdown crudo (las viñetas con bold/inline code) — el frontend
lo renderiza con un componente de markdown si quiere mostrarlo bonito.
"""

from __future__ import annotations

import re
from pathlib import Path

_RELEASE_HEADER = re.compile(r"^##\s*\[(?P<version>[^\]]+)\](?:\s*-\s*(?P<fecha>[\d-]+))?\s*$")
_SECTION_HEADER = re.compile(r"^###\s+(?P<titulo>.+?)\s*$")
_SEMVER = re.compile(r"\d+\.\d+\.\d+")


def _normalize_version(label: str) -> str:
    match = _SEMVER.search(label)
    return match.group(0) if match else label


def _find_changelog() -> Path | None:
    candidates = [
        Path("/app/_docs/CHANGELOG.md"),
        Path(__file__).resolve().parent.parent.parent.parent / "docs" / "CHANGELOG.md",
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def parse_changelog(limit: int = 5) -> list[dict]:
    path = _find_changelog()
    if not path:
        return []

    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    releases: list[dict] = []
    current: dict | None = None
    current_section: dict | None = None

    for line in lines:
        m_release = _RELEASE_HEADER.match(line)
        if m_release:
            version_label = m_release.group("version").strip()
            if version_label.lower() in {"unreleased", "no publicado"}:
                current = None
                current_section = None
                continue
            current = {
                "version": _normalize_version(version_label),
                "fecha": (m_release.group("fecha") or "").strip() or None,
                "secciones": [],
            }
            current_section = None
            releases.append(current)
            if len(releases) > limit:
                releases.pop()
                break
            continue

        if current is None:
            continue

        m_section = _SECTION_HEADER.match(line)
        if m_section:
            current_section = {
                "titulo": m_section.group("titulo").strip(),
                "contenido": "",
            }
            current["secciones"].append(current_section)
            continue

        if current_section is not None:
            current_section["contenido"] += line + "\n"
        elif line.strip() and not current["secciones"]:
            current["secciones"].append({
                "titulo": "",
                "contenido": line + "\n",
            })

    for release in releases:
        for section in release["secciones"]:
            section["contenido"] = section["contenido"].strip("\n")

    return releases[:limit]
