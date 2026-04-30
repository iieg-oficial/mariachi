from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path

PALETTES_CSV = Path(__file__).resolve().parents[1] / "data" / "paletas_simbologia.csv"


@lru_cache(maxsize=1)
def load_palettes() -> list[dict]:
    if not PALETTES_CSV.exists():
        return []

    grouped: dict[str, dict] = {}
    with PALETTES_CSV.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("palette_name") or "").strip()
            if not name:
                continue
            tipo = (row.get("tipo_paleta") or "").strip()
            severidad = (row.get("severidad") or "").strip()
            n_classes = (row.get("n_classes") or "").strip()
            try:
                step = int(row.get("step") or 0)
            except (TypeError, ValueError):
                step = 0
            hex_color = (row.get("hex") or "").strip()
            color = f"#{hex_color}" if hex_color and not hex_color.startswith("#") else hex_color

            entry = grouped.setdefault(
                name,
                {
                    "name": name,
                    "tipo": tipo,
                    "severidad": severidad,
                    "n_classes": int(n_classes) if n_classes.isdigit() else None,
                    "colors": [],
                    "_steps": [],
                },
            )
            entry["_steps"].append((step, color))

    out: list[dict] = []
    for entry in grouped.values():
        entry["_steps"].sort(key=lambda t: t[0])
        entry["colors"] = [c for _, c in entry["_steps"]]
        del entry["_steps"]
        out.append(entry)

    out.sort(key=lambda e: (e["tipo"], e["name"]))
    return out
