from __future__ import annotations

PARES_CRITICOS: tuple[tuple[str, str, str], ...] = (
    ("color.text", "color.bg", "Texto sobre el fondo de página"),
    ("color.text", "color.surface", "Texto sobre tarjetas"),
    ("color.muted", "color.bg", "Texto secundario sobre el fondo"),
    ("color.primary", "color.bg", "Color principal sobre el fondo"),
    ("color.secondary", "color.bg", "Color secundario sobre el fondo"),
    ("color.accent", "color.bg", "Color de acento sobre el fondo"),
    ("color.danger", "color.bg", "Estado de error sobre el fondo"),
    ("color.success", "color.bg", "Estado positivo sobre el fondo"),
    ("color.warning", "color.bg", "Advertencia sobre el fondo"),
    ("color.info", "color.bg", "Informativo sobre el fondo"),
)

MINIMO_AA = 4.5
MINIMO_AA_GRANDE = 3.0


def _canal(valor: float) -> float:
    proporcion = valor / 255
    if proporcion <= 0.03928:
        return proporcion / 12.92
    return ((proporcion + 0.055) / 1.055) ** 2.4


def parse_hex(color: str) -> tuple[int, int, int] | None:
    texto = str(color).strip().lstrip("#")
    if len(texto) == 3:
        texto = "".join(c * 2 for c in texto)
    if len(texto) != 6:
        return None
    try:
        return tuple(int(texto[i : i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None


def luminancia(color: str) -> float | None:
    rgb = parse_hex(color)
    if rgb is None:
        return None
    r, g, b = (_canal(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(frente: str, fondo: str) -> float | None:
    a, b = luminancia(frente), luminancia(fondo)
    if a is None or b is None:
        return None
    claro, oscuro = max(a, b), min(a, b)
    return (claro + 0.05) / (oscuro + 0.05)


def evaluar(colores: dict[str, str]) -> list[dict[str, object]]:
    hallazgos: list[dict[str, object]] = []
    for clave_frente, clave_fondo, descripcion in PARES_CRITICOS:
        frente, fondo = colores.get(clave_frente), colores.get(clave_fondo)
        if not frente or not fondo:
            continue
        valor = ratio(frente, fondo)
        if valor is None:
            continue
        hallazgos.append(
            {
                "frente": clave_frente,
                "fondo": clave_fondo,
                "descripcion": descripcion,
                "ratio": round(valor, 2),
                "cumple_aa": valor >= MINIMO_AA,
                "cumple_aa_texto_grande": valor >= MINIMO_AA_GRANDE,
            }
        )
    return hallazgos


def incumplimientos(colores: dict[str, str]) -> list[dict[str, object]]:
    return [h for h in evaluar(colores) if not h["cumple_aa"]]
