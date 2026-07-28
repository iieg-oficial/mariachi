from __future__ import annotations

import io
import json
import zipfile
from typing import Any

from sqlalchemy.orm import Session

from app.models.identidad import Marca, MarcaCampo, MarcaFuente, MarcaToken

PREFIJOS_CSS: tuple[tuple[str, str], ...] = (
    ("font.family.", "--font-"),
    ("font.size.", "--text-"),
    ("font.weight.", "--font-weight-"),
    ("color.", "--color-"),
    ("leading.", "--leading-"),
    ("space.", "--spacing-"),
    ("radius.", "--radius-"),
    ("shadow.", "--shadow-"),
    ("breakpoint.", "--breakpoint-"),
)

ARCHIVO_POR_GRUPO: dict[str, str] = {
    "color": "color",
    "dataviz": "dataviz",
    "tipografia": "typography",
    "espaciado": "space",
    "radio": "space",
    "sombra": "effects",
    "breakpoint": "layout",
}

AVISO = "/** Generado por mariachi desde el modulo Identidad. No editar a mano. */"

ETIQUETAS: dict[str, str] = {
    "brand.personality": "Personalidad",
    "brand.transmit": "Debe transmitir",
    "brand.avoid": "Evitar",
    "logo.largo.claro": "Largo, fondo claro",
    "logo.largo.oscuro": "Largo, fondo oscuro",
    "logo.corto.claro": "Corto, fondo claro",
    "logo.corto.oscuro": "Corto, fondo oscuro",
    "logo.clearspace": "Área de protección",
    "logo.clearspace.factor": "Factor del área de protección",
    "logo.minsize.screen": "Tamaño mínimo en pantalla",
    "logo.minsize.print": "Tamaño mínimo impreso",
    "color.accent.max": "Máximo de colores de acento por vista",
    "type.titles.font": "Fuente de títulos",
    "type.titles.weights": "Pesos de títulos",
    "type.body.font": "Fuente de cuerpo",
    "type.body.weights": "Pesos de cuerpo",
    "type.data.font": "Fuente de datos y cifras",
    "type.data.weights": "Pesos de datos y cifras",
    "space.base": "Unidad base de espaciado",
    "grid.cols": "Columnas de la rejilla",
    "grid.gutter": "Canaleta",
    "grid.maxwidth": "Ancho máximo de contenido",
    "comp.buttons.rules": "Botones",
    "comp.links.underline": "Subrayado de enlaces",
    "comp.forms.touch": "Área táctil mínima",
    "comp.cards.padding": "Padding de tarjetas",
    "comp.nav.rules": "Navegación",
    "icon.set": "Set de iconos",
    "icon.photo": "Estilo de fotografía e ilustración",
    "data.categorical.max": "Máximo de categorías distinguibles",
    "map.projection": "Proyección",
    "copy.tone": "Tono",
    "copy.dates": "Formato de fechas",
    "copy.caps": "Mayúsculas",
    "ref.manual": "Manual de identidad",
    "ref.assets": "Archivos de marca",
    "ref.site": "Sitio de referencia",
}


def etiqueta(clave: str, prefijo: str) -> str:
    return ETIQUETAS.get(clave, clave[len(prefijo) :].replace(".", " "))


def nombre_css(clave: str) -> str | None:
    for prefijo, css in PREFIJOS_CSS:
        if clave.startswith(prefijo):
            resto = clave[len(prefijo) :].replace(".", "-")
            return f"{css}{resto}"
    return None


def valor_css(valor: Any) -> str:
    if isinstance(valor, list):
        return ", ".join(str(v) for v in valor)
    return str(valor)


def declaraciones(tokens: list[MarcaToken]) -> list[str]:
    lineas: list[str] = []
    for token in tokens:
        nombre = nombre_css(token.clave)
        if nombre is None:
            continue
        lineas.append(f"  {nombre}: {valor_css(token.valor)};")
    return lineas


def render_theme_css(tokens: list[MarcaToken]) -> str:
    cuerpo = "\n".join(declaraciones(tokens))
    return f"{AVISO}\n@theme {{\n{cuerpo}\n}}\n"


def render_tokens_css(tokens: list[MarcaToken]) -> str:
    cuerpo = "\n".join(declaraciones(tokens))
    return f"{AVISO}\n:root {{\n{cuerpo}\n}}\n"


def render_fonts_css(fuentes: list[MarcaFuente]) -> str:
    bloques: list[str] = [AVISO]
    for fuente in fuentes:
        base = (fuente.base_url or "").rstrip("/")
        for face in fuente.faces or []:
            archivo = face.get("file")
            if not archivo:
                continue
            url = f"{base}/{archivo}" if base else archivo
            bloques.append(
                "@font-face {\n"
                f'  font-family: "{fuente.familia}";\n'
                f'  src: url("{url}") format("{fuente.formato}");\n'
                f"  font-weight: {face.get('weight', 400)};\n"
                f"  font-style: {face.get('style', 'normal')};\n"
                "  font-display: swap;\n"
                "}"
            )
    return "\n".join(bloques) + "\n"


def render_tokens_json(tokens: list[MarcaToken]) -> dict[str, str]:
    agrupados: dict[str, dict[str, Any]] = {}
    for token in tokens:
        archivo = ARCHIVO_POR_GRUPO.get(token.grupo, token.grupo)
        raiz = agrupados.setdefault(archivo, {})
        nodo = raiz
        partes = token.clave.split(".")
        for parte in partes[:-1]:
            nodo = nodo.setdefault(parte, {})
        entrada: dict[str, Any] = {"$type": token.tipo, "$value": token.valor}
        if token.descripcion:
            entrada["$description"] = token.descripcion
        nodo[partes[-1]] = entrada
    return {
        f"{nombre}.tokens.json": json.dumps(datos, indent=2, ensure_ascii=False) + "\n"
        for nombre, datos in sorted(agrupados.items())
    }


def _seccion(titulo: str, filas: list[str]) -> list[str]:
    if not filas:
        return []
    return [f"## {titulo}", ""] + filas + [""]


def _campos_de(campos: dict[str, str], prefijo: str) -> list[str]:
    return [
        f"- **{etiqueta(clave, prefijo)}:** {valor}"
        for clave, valor in sorted(campos.items())
        if clave.startswith(prefijo) and valor
    ]


def render_design_md(
    marca: Marca,
    campos: dict[str, str],
    tokens: list[MarcaToken],
) -> str:
    lineas: list[str] = [
        f"# Identidad visual — {marca.nombre}",
        "",
        "Generado por mariachi desde el módulo Identidad. No editar a mano: los valores se",
        f"administran en el admin y se vuelven a descargar. Marca `{marca.codigo}`.",
        "",
        "Si un dato no aparece aquí es que no está definido todavía: preguntar antes de",
        "inventarlo.",
        "",
    ]

    lineas += _seccion("Principios de marca", _campos_de(campos, "brand."))
    lineas += _seccion("Logotipo", _campos_de(campos, "logo."))

    colores = [t for t in tokens if t.grupo == "color"]
    if colores:
        filas = ["| Token | Valor | Uso |", "|---|---|---|"]
        filas += [
            f"| `{nombre_css(t.clave)}` | `{valor_css(t.valor)}` | {t.descripcion or ''} |"
            for t in colores
        ]
        lineas += _seccion("Paleta de color", filas)

    tipografia = _campos_de(campos, "type.")
    familias = [t for t in tokens if t.clave.startswith("font.family.")]
    if familias:
        tipografia += [
            f"- **{t.clave.split('.')[-1]}:** {valor_css(t.valor)}" for t in familias
        ]
    lineas += _seccion("Tipografía", tipografia)

    lineas += _seccion(
        "Espaciado y rejilla", _campos_de(campos, "space.") + _campos_de(campos, "grid.")
    )
    lineas += _seccion("Componentes", _campos_de(campos, "comp."))
    lineas += _seccion("Iconografía e imágenes", _campos_de(campos, "icon."))

    dataviz = _campos_de(campos, "data.") + _campos_de(campos, "map.")
    paletas = [t for t in tokens if t.grupo == "dataviz"]
    if paletas:
        dataviz.append(f"- **Tokens de paleta definidos:** {len(paletas)}")
    lineas += _seccion("Visualización de datos", dataviz)

    lineas += _seccion("Redacción", _campos_de(campos, "copy."))
    lineas += _seccion("Referencias", _campos_de(campos, "ref."))

    lineas += [
        "## Reglas fijas",
        "",
        "No dependen de la configuración y aplican siempre:",
        "",
        "- Usar solo los tokens definidos. Nada de valores hex sueltos ni tamaños mágicos.",
        "- No deformar, rotar, recolorear ni agregar efectos al logotipo.",
        "- Accesibilidad WCAG 2.1 AA: contraste, foco visible, semántica, `alt` y etiquetas.",
        "- Nunca transmitir información solo con color.",
        "- Al construir componentes, incluir todos los estados: hover, foco, deshabilitado y error.",
        "",
    ]
    return "\n".join(lineas)


def cargar_marca(db: Session, codigo: str) -> Marca | None:
    return db.query(Marca).filter(Marca.codigo == codigo).first()


def tokens_de(db: Session, marca: Marca) -> list[MarcaToken]:
    return (
        db.query(MarcaToken)
        .filter(MarcaToken.marca_id == marca.id)
        .order_by(MarcaToken.orden, MarcaToken.clave)
        .all()
    )


def colores_de(tokens: list[MarcaToken]) -> dict[str, str]:
    return {
        t.clave: t.valor
        for t in tokens
        if t.grupo == "color" and isinstance(t.valor, str)
    }


def actualizar_token(db: Session, marca: Marca, token_id: int, datos: dict) -> MarcaToken:
    token = (
        db.query(MarcaToken)
        .filter(MarcaToken.id == token_id, MarcaToken.marca_id == marca.id)
        .first()
    )
    if token is None:
        raise LookupError(f"Token {token_id} no encontrado en la marca '{marca.codigo}'")
    if "valor" in datos:
        token.valor = datos["valor"]
    if "descripcion" in datos:
        token.descripcion = datos["descripcion"]
    db.commit()
    db.refresh(token)
    return token


def actualizar_campos(db: Session, marca: Marca, valores: dict[str, str]) -> int:
    existentes = {
        campo.clave: campo
        for campo in db.query(MarcaCampo).filter(MarcaCampo.marca_id == marca.id).all()
    }
    for clave, valor in valores.items():
        if clave in existentes:
            existentes[clave].valor = valor
        else:
            db.add(MarcaCampo(marca_id=marca.id, clave=clave, valor=valor))
    db.commit()
    return len(valores)


def artefactos(db: Session, marca: Marca) -> dict[str, str]:
    tokens = (
        db.query(MarcaToken)
        .filter(MarcaToken.marca_id == marca.id)
        .order_by(MarcaToken.orden, MarcaToken.clave)
        .all()
    )
    fuentes = (
        db.query(MarcaFuente)
        .filter(MarcaFuente.marca_id == marca.id)
        .order_by(MarcaFuente.orden)
        .all()
    )
    campos = {
        campo.clave: campo.valor or ""
        for campo in db.query(MarcaCampo).filter(MarcaCampo.marca_id == marca.id).all()
    }

    salida = {
        "design.md": render_design_md(marca, campos, tokens),
        "theme.css": render_theme_css(tokens),
        "tokens.css": render_tokens_css(tokens),
        "fonts.css": render_fonts_css(fuentes),
    }
    for nombre, contenido in render_tokens_json(tokens).items():
        salida[f"tokens/{nombre}"] = contenido
    return salida


def empaquetar(marca: Marca, salida: dict[str, str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for nombre, contenido in sorted(salida.items()):
            zf.writestr(f"{marca.codigo}/{nombre}", contenido)
    return buffer.getvalue()
