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


def _rgba(hex_color: Any, alpha: float) -> str:
    texto = str(hex_color or "").strip().lstrip("#")
    if len(texto) == 3:
        texto = "".join(caracter * 2 for caracter in texto)
    if len(texto) != 6:
        return "palette(alternate-base)"
    try:
        rojo, verde, azul = (int(texto[i : i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return "palette(alternate-base)"
    return f"rgba({rojo}, {verde}, {azul}, {alpha})"


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
    accent_deep = indice.get("color.accent-deep")
    accent_soft = indice.get("color.accent-soft")
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
        bloques.append(f"    border: 1px solid {primary};")
        bloques.append("}")
        bloques.append("")
        bloques.append("QPushButton[brandRole=\"primary\"]:disabled {")
        bloques.append("    background-color: palette(mid);")
        bloques.append("    color: palette(disabled-text);")
        bloques.append("}")
        bloques.append("")
        seleccion = accent_deep or primary
        sobre_seleccion = bg or "#FFFFFF"
        bloques.append("/* Se usa la variante oscura del acento, no el acento base: sobre")
        bloques.append("   #FF8300 el blanco da 2.47:1 y ningun texto cumple AA salvo negro. */")
        bloques.append("QTreeView::item:selected, QTreeWidget::item:selected {")
        bloques.append(f"    background-color: {seleccion};")
        bloques.append(f"    color: {sobre_seleccion};")
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

    if primary:
        bloques.append("QPushButton[brandRole=\"secondary\"] {")
        bloques.append("    background-color: transparent;")
        bloques.append(f"    color: {primary};")
        bloques.append(f"    border: 1px solid {primary};")
        bloques.append(f"    border-radius: {radius_sm}px;")
        bloques.append(f"    padding: {space_2}px {space_3}px;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QPushButton[brandRole=\"secondary\"]:hover {")
        bloques.append(f"    background-color: {primary};")
        bloques.append(f"    color: {bg or '#FFFFFF'};")
        bloques.append("}")
        bloques.append("")
        bloques.append("/* Mismo sangrado horizontal que primary y secondary, para que los")
        bloques.append("   tres textos arranquen en la misma linea vertical. */")
        bloques.append("QPushButton[brandRole=\"quiet\"] {")
        bloques.append("    background-color: transparent;")
        bloques.append(f"    color: {text or primary};")
        bloques.append("    border: none;")
        bloques.append("    text-align: left;")
        bloques.append(f"    padding: {space_2}px {space_3}px;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QPushButton[brandRole=\"quiet\"]:hover {")
        bloques.append(f"    color: {primary};")
        bloques.append("    text-decoration: underline;")
        bloques.append("}")
        bloques.append("")
        bloques.append("/* Contenedores redondeados, como las tarjetas del visor. */")
        bloques.append("QTreeView, QTreeWidget {")
        bloques.append("    border: 1px solid palette(mid);")
        bloques.append(f"    border-radius: {radius_md}px;")
        bloques.append(f"    padding: {space_2}px;")
        bloques.append("    show-decoration-selected: 1;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QWidget[brandRole=\"card\"] {")
        bloques.append(f"    border-radius: {radius_md}px;")
        bloques.append("    border: 1px solid palette(mid);")
        bloques.append(f"    padding: {space_2}px;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QTreeView::item, QTreeWidget::item {")
        bloques.append("    padding: 2px 0px;")
        bloques.append(f"    border-radius: {radius_sm}px;")
        bloques.append("}")
        bloques.append("")
        hover = accent_soft or _rgba(accent or primary, 0.18)
        bloques.append("QTreeView::item:hover, QTreeWidget::item:hover {")
        bloques.append(f"    background-color: {hover};")
        bloques.append("    color: palette(text);")
        bloques.append("}")
        bloques.append("")
        bloques.append("/* La rama hereda el azul nativo si no se tine: la seleccion se")
        bloques.append("   veria partida entre la sangria y el texto. */")
        bloques.append("QTreeView::branch:selected, QTreeWidget::branch:selected {")
        bloques.append(f"    background-color: {seleccion};")
        bloques.append("}")
        bloques.append("")
        bloques.append("QTreeView::branch:hover, QTreeWidget::branch:hover {")
        bloques.append(f"    background-color: {hover};")
        bloques.append("}")
        bloques.append("")
        bloques.append("QLabel[brandRole=\"title\"] {")
        bloques.append(f"    color: {primary};")
        bloques.append(f"    font-size: {_a_px(indice.get('font.size.lg'), 18)}px;")
        bloques.append("    font-weight: 700;")
        bloques.append(f"    padding: {space_2}px 0px;")
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
