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
    primary_deep = indice.get("color.primary-deep")
    surface_field = indice.get("color.surface-field")

    familia = _familia(indice)
    radius_sm = _a_px(indice.get("radius.sm"), 4)
    radius_md = _a_px(indice.get("radius.md"), 8)
    radius_lg = _a_px(indice.get("radius.lg"), 16)
    space_2 = _a_px(indice.get("space.2"), 8)
    space_3 = _a_px(indice.get("space.3"), 12)
    size_base = _a_px(indice.get("font.size.base"), 16)
    size_sm = _a_px(indice.get("font.size.sm"), 14)

    altura_boton = size_base + space_2 * 2 + 6
    radius_full = min(_a_px(indice.get("radius.full"), 9999), altura_boton // 2)

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
        bloques.append("/* Pildora, como los botones del visor. El radio se acota a la mitad")
        bloques.append("   del alto: Qt no interpreta un 9999px como CSS y deja la esquina recta. */")
        bloques.append("QPushButton[brandRole=\"primary\"] {")
        bloques.append(f"    background-color: {primary};")
        bloques.append(f"    color: {bg or '#FFFFFF'};")
        bloques.append(f"    border-radius: {radius_full}px;")
        bloques.append(f"    padding: {space_2}px {space_3}px;")
        bloques.append(f"    border: 1px solid {primary};")
        bloques.append("}")
        bloques.append("")
        bloques.append("QPushButton[brandRole=\"primary\"]:disabled {")
        bloques.append("    background-color: palette(mid);")
        bloques.append("    color: palette(disabled-text);")
        bloques.append("}")
        bloques.append("")
        seleccion = accent_soft or primary
        sobre_seleccion = accent_deep or (bg or "#FFFFFF")
        bloques.append("/* Seleccion: superficie clara del acento con el acento oscuro en el")
        bloques.append("   texto (4.86:1). El acento base da 2.09:1 sobre ese fondo. El lado")
        bloques.append("   izquierdo va sin radio para que empalme con la rama teñida. */")
        bloques.append("QTreeView::item:selected, QTreeWidget::item:selected {")
        bloques.append(f"    background-color: {seleccion};")
        bloques.append(f"    color: {sobre_seleccion};")
        bloques.append("    border-top-left-radius: 0px;")
        bloques.append("    border-bottom-left-radius: 0px;")
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

    if surface_field:
        bloques.append("QTreeView, QTreeWidget {")
        bloques.append(f"    background-color: {bg or '#FFFFFF'};")
        bloques.append(f"    border-radius: {radius_lg}px;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QWidget[brandRole=\"panel\"] {")
        bloques.append(f"    background-color: {bg or '#FFFFFF'};")
        bloques.append("}")
        bloques.append("")
        bloques.append("/* Campo de busqueda: misma superficie, radio y color de texto que")
        bloques.append("   el buscador del visor, sin borde y con el foco en el primario. */")
        bloques.append("QLineEdit[brandRole=\"search\"] {")
        bloques.append(f"    background-color: {surface_field};")
        bloques.append(f"    color: {primary or text};")
        bloques.append("    border: none;")
        bloques.append(f"    border-radius: {radius_lg}px;")
        bloques.append(f"    padding: {space_3}px {space_3}px;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QLineEdit[brandRole=\"search\"]:focus {")
        bloques.append(f"    border: 1px solid {primary_deep or primary};")
        bloques.append("}")
        bloques.append("")

    if primary:
        bloques.append("QPushButton[brandRole=\"secondary\"] {")
        bloques.append("    background-color: transparent;")
        bloques.append(f"    color: {primary};")
        bloques.append(f"    border: 1px solid {primary};")
        bloques.append(f"    border-radius: {radius_full}px;")
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
        bloques.append("QTreeView, QTreeWidget {")
        bloques.append("    border: none;")
        bloques.append("    outline: none;")
        bloques.append("/* 0 = el realce cubre solo la etiqueta y su icono, no la fila")
        bloques.append("   entera hasta el borde del panel. */")
        bloques.append("    show-decoration-selected: 0;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QWidget[brandRole=\"card\"] {")
        bloques.append(f"    border-radius: {radius_md}px;")
        bloques.append("    border: 1px solid palette(mid);")
        bloques.append(f"    padding: {space_2}px;")
        bloques.append("}")
        bloques.append("")
        bloques.append("/* Sin borde ni outline: el estilo nativo dibuja su propio realce")
        bloques.append("   azul encima del hover si no se anulan los dos. */")
        bloques.append("QTreeView::item, QTreeWidget::item {")
        bloques.append("    padding: 2px 0px;")
        bloques.append(f"    border-radius: {radius_sm}px;")
        bloques.append("    border: none;")
        bloques.append("    outline: none;")
        bloques.append("}")
        bloques.append("")
        hover = _rgba(text or primary, 0.08)
        bloques.append("QTreeView::item:hover, QTreeWidget::item:hover {")
        bloques.append(f"    background-color: {hover};")
        bloques.append("    color: palette(text);")
        bloques.append("    border: none;")
        bloques.append("    outline: none;")
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
        bloques.append("QScrollBar:vertical {")
        bloques.append("    background: transparent;")
        bloques.append("    width: 10px;")
        bloques.append("    margin: 0px;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QScrollBar::handle:vertical {")
        bloques.append(f"    background: {_rgba(text or primary, 0.28)};")
        bloques.append("    border-radius: 5px;")
        bloques.append("    min-height: 28px;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QScrollBar::handle:vertical:hover {")
        bloques.append(f"    background: {primary};")
        bloques.append("}")
        bloques.append("")
        bloques.append("QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical,")
        bloques.append("QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {")
        bloques.append("    background: none;")
        bloques.append("    height: 0px;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QScrollBar:horizontal { height: 10px; background: transparent; }")
        bloques.append("")
        bloques.append("QScrollBar::handle:horizontal {")
        bloques.append(f"    background: {_rgba(text or primary, 0.28)};")
        bloques.append("    border-radius: 5px;")
        bloques.append("    min-width: 28px;")
        bloques.append("}")
        bloques.append("")
        bloques.append("QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal,")
        bloques.append("QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal {")
        bloques.append("    background: none;")
        bloques.append("    width: 0px;")
        bloques.append("}")
        bloques.append("")
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
