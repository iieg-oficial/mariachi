from __future__ import annotations

from typing import Any

from app.models.identidad import MarcaFuente, MarcaToken

AVISO_QSS = "/* Generado por mariachi desde el modulo Identidad. No editar a mano. */"

RAIZ_REM_PX = 16

FALLBACK_FAMILIA = "system-ui"


def _valor(token: MarcaToken) -> Any:
    return token.valor


def _a_px(valor: Any, defecto: int) -> int:
    texto = str(valor).strip()
    try:
        if texto.endswith("rem"):
            return round(float(texto[:-3]) * RAIZ_REM_PX)
        if texto.endswith("px"):
            return round(float(texto[:-2]))
        return round(float(texto))
    except (TypeError, ValueError):
        return defecto


def _indice(tokens: list[MarcaToken]) -> dict[str, Any]:
    return {token.clave: _valor(token) for token in tokens}


def _familia(indice: dict[str, Any]) -> str:
    valor = indice.get("font.family.sans")
    if isinstance(valor, list) and valor:
        familias = [str(item).strip().strip('"') for item in valor if str(item).strip()]
    elif isinstance(valor, str) and valor:
        familias = [item.strip().strip('"') for item in valor.split(",") if item.strip()]
    else:
        familias = [FALLBACK_FAMILIA]
    return ", ".join(f'"{familia}"' for familia in familias)


def _fuentes_declaradas(fuentes: list[MarcaFuente]) -> list[str]:
    lineas: list[str] = []
    for fuente in fuentes:
        base = (fuente.base_url or "").rstrip("/")
        for face in fuente.faces or []:
            archivo = face.get("file")
            if not archivo:
                continue
            url = f"{base}/{archivo}" if base else archivo
            lineas.append(f"   {fuente.familia} {face.get('weight', 400)}: {url}")
    return lineas


def render_tokens_qss(tokens: list[MarcaToken], fuentes: list[MarcaFuente]) -> str:
    indice = _indice(tokens)

    primary = indice.get("color.primary")
    text = indice.get("color.text")
    bg = indice.get("color.bg")
    accent = indice.get("color.accent")
    secondary = indice.get("color.secondary")

    familia = _familia(indice)
    radius_sm = _a_px(indice.get("radius.sm"), 4)
    radius_md = _a_px(indice.get("radius.md"), 8)
    space_2 = _a_px(indice.get("space.2"), 8)
    space_3 = _a_px(indice.get("space.3"), 12)
    size_base = _a_px(indice.get("font.size.base"), 16)
    size_sm = _a_px(indice.get("font.size.sm"), 14)

    bloques: list[str] = [AVISO_QSS, ""]

    bloques.append("/* Se aplica sobre el widget raiz del consumidor, no sobre la aplicacion.")
    bloques.append("   Solo define marca: familia, acentos, radios y espaciados.")
    bloques.append("   Fondos y texto base se dejan al tema del anfitrion salvo donde")
    bloques.append("   la identidad lo exige, para no romper el modo oscuro. */")
    bloques.append("")

    if fuentes:
        bloques.append("/* Fuentes de la marca (descargar y registrar en el cliente):")
        bloques.extend(_fuentes_declaradas(fuentes))
        bloques.append("*/")
        bloques.append("")

    bloques.append("* {")
    bloques.append(f"    font-family: {familia};")
    bloques.append(f"    font-size: {size_base}px;")
    bloques.append("}")
    bloques.append("")

    if primary:
        bloques.append("QPushButton[brandRole=\"primary\"] {")
        bloques.append(f"    background-color: {primary};")
        bloques.append(f"    color: {bg or '#FFFFFF'};")
        bloques.append(f"    border-radius: {radius_sm}px;")
        bloques.append(f"    padding: {space_2}px {space_3}px;")
        bloques.append("    border: none;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QPushButton[brandRole=\"primary\"]:disabled {")
        bloques.append("    background-color: palette(mid);")
        bloques.append("    color: palette(disabled-text);")
        bloques.append("}")
        bloques.append("")
        bloques.append("QTreeView::item:selected, QTreeWidget::item:selected {")
        bloques.append(f"    background-color: {primary};")
        bloques.append(f"    color: {bg or '#FFFFFF'};")
        bloques.append("}")
        bloques.append("")
        bloques.append("QLineEdit:focus {")
        bloques.append(f"    border: 1px solid {primary};")
        bloques.append("}")
        bloques.append("")

    bloques.append("QLineEdit {")
    bloques.append(f"    border-radius: {radius_sm}px;")
    bloques.append(f"    padding: {space_2}px;")
    bloques.append("    border: 1px solid palette(mid);")
    bloques.append("}")
    bloques.append("")

    if secondary:
        bloques.append("QLabel[brandRole=\"heading\"] {")
        bloques.append(f"    color: {secondary};")
        bloques.append(f"    font-size: {_a_px(indice.get('font.size.lg'), 18)}px;")
        bloques.append("    font-weight: 600;")
        bloques.append("}")
        bloques.append("")

    if accent:
        bloques.append("/* El acento no cumple contraste AA como texto: solo fondo. */")
        bloques.append("QLabel[brandRole=\"badge\"] {")
        bloques.append(f"    background-color: {accent};")
        bloques.append(f"    color: {text or '#000000'};")
        bloques.append(f"    border-radius: {radius_md}px;")
        bloques.append(f"    padding: 1px {space_2}px;")
        bloques.append(f"    font-size: {size_sm}px;")
        bloques.append("}")
        bloques.append("")

    return "\n".join(bloques).rstrip() + "\n"
