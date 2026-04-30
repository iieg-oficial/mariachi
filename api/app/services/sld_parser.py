from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

from pydantic import BaseModel

NS = {
    "sld": "http://www.opengis.net/sld",
    "ogc": "http://www.opengis.net/ogc",
}

ABSTRACT_PREFIX = "Unidades: "


class StrokeModel(BaseModel):
    color: str = "#FFFFFF"
    width: float = 0.35
    opacity: float = 1.0
    linejoin: str = "bevel"


class HatchModel(BaseModel):
    well_known_name: str = "shape://times"
    color: str = "#7A7A7A"
    size: int | float = 7
    stroke_width: float = 1.0
    opacity: float = 1.0


class NullStyleModel(BaseModel):
    enabled: bool = True
    label: str = "Sin dato"
    background_color: str = "#FFFFFF"
    stroke: StrokeModel = StrokeModel(color="#7A7A7A")
    hatch: HatchModel = HatchModel()


class ChoroplethModel(BaseModel):
    layer_name: str
    style_title: str
    style_abstract: str = ""
    units: str = ""
    attribute: str
    cortes: list[float | int | None]
    labels: list[str]
    colors: list[str]
    stroke: StrokeModel
    null_style: NullStyleModel | None = None


class FontModel(BaseModel):
    family: str = "Arial"
    size: int | float = 11
    style: str = "normal"
    weight: str = "normal"


class HaloModel(BaseModel):
    radius: int | float = 2
    color: str = "#FFFFFF"


class LabelPlacementModel(BaseModel):
    anchor_x: float = 0.5
    anchor_y: float = 0.5


class LabelStyleModel(BaseModel):
    field: str
    geometry_function: str | None = None
    geometry_property: str | None = None
    font: FontModel = FontModel()
    fill_color: str = "#000000"
    halo: HaloModel | None = None
    placement: LabelPlacementModel = LabelPlacementModel()
    vendor_options: dict[str, str] = {}
    min_scale: float | None = None
    max_scale: float | None = None


class PolygonStyleModel(BaseModel):
    fill_color: str | None = None
    fill_opacity: float = 1.0
    stroke: StrokeModel | None = None
    rule_name: str | None = None
    min_scale: float | None = None
    max_scale: float | None = None


class BoundaryModel(BaseModel):
    layer_name: str
    style_title: str = ""
    polygon: PolygonStyleModel | None = None
    label: LabelStyleModel | None = None


class ParseResult(BaseModel):
    editable: bool
    shape: str | None = None
    model: ChoroplethModel | BoundaryModel | None = None
    raw_xml: str
    reason: str | None = None


def _t(tag: str) -> str:
    prefix, _, local = tag.partition(":")
    return f"{{{NS[prefix]}}}{local}"


def _text(elem: ET.Element | None, default: str = "") -> str:
    if elem is None or elem.text is None:
        return default
    return elem.text.strip()


def _to_number(s: str) -> float | int:
    s = s.strip()
    try:
        return int(s)
    except ValueError:
        return float(s)


def _css_params(parent: ET.Element) -> dict[str, str]:
    out: dict[str, str] = {}
    for css in parent.findall(_t("sld:CssParameter")):
        name = css.attrib.get("name")
        if name is not None and css.text is not None:
            out[name] = css.text.strip()
    return out


def _parse_stroke(stroke_elem: ET.Element | None) -> StrokeModel:
    if stroke_elem is None:
        return StrokeModel()
    p = _css_params(stroke_elem)
    return StrokeModel(
        color=p.get("stroke", "#FFFFFF"),
        width=float(p.get("stroke-width", 0.35)),
        opacity=float(p.get("stroke-opacity", 1.0)),
        linejoin=p.get("stroke-linejoin", "bevel"),
    )


def _parse_filter(filter_elem: ET.Element) -> dict[str, Any]:
    null_check = filter_elem.find(_t("ogc:PropertyIsNull"))
    if null_check is not None:
        prop = _text(null_check.find(_t("ogc:PropertyName")))
        return {"kind": "null", "attribute": prop}

    and_node = filter_elem.find(_t("ogc:And"))
    target_parent: ET.Element = and_node if and_node is not None else filter_elem

    lower_node = target_parent.find(_t("ogc:PropertyIsGreaterThanOrEqualTo"))
    upper_lt = target_parent.find(_t("ogc:PropertyIsLessThan"))
    upper_lte = target_parent.find(_t("ogc:PropertyIsLessThanOrEqualTo"))

    info: dict[str, Any] = {"kind": "range"}

    if lower_node is not None:
        info["attribute"] = _text(lower_node.find(_t("ogc:PropertyName")))
        info["lower"] = _to_number(_text(lower_node.find(_t("ogc:Literal"))))
    else:
        info["lower"] = None

    upper_node = upper_lt if upper_lt is not None else upper_lte
    if upper_node is not None:
        info["attribute"] = info.get("attribute") or _text(upper_node.find(_t("ogc:PropertyName")))
        info["upper"] = _to_number(_text(upper_node.find(_t("ogc:Literal"))))
        info["upper_inclusive"] = upper_node is upper_lte
    else:
        info["upper"] = None
        info["upper_inclusive"] = False

    if "attribute" not in info:
        return {"kind": "unknown"}

    return info


def _parse_polygon_symbolizers(rule: ET.Element) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for sym in rule.findall(_t("sld:PolygonSymbolizer")):
        fill_elem = sym.find(_t("sld:Fill"))
        stroke_elem = sym.find(_t("sld:Stroke"))
        graphic_fill = (
            fill_elem.find(_t("sld:GraphicFill")) if fill_elem is not None else None
        )

        entry: dict[str, Any] = {"stroke": _parse_stroke(stroke_elem)}

        if graphic_fill is not None:
            mark = graphic_fill.find(f"{_t('sld:Graphic')}/{_t('sld:Mark')}")
            size_elem = graphic_fill.find(f"{_t('sld:Graphic')}/{_t('sld:Size')}")
            entry["graphic"] = True
            if mark is not None:
                wkn = _text(mark.find(_t("sld:WellKnownName")))
                stroke_in_mark = mark.find(_t("sld:Stroke"))
                stroke_params = _css_params(stroke_in_mark) if stroke_in_mark is not None else {}
                entry["hatch"] = HatchModel(
                    well_known_name=wkn or "shape://times",
                    color=stroke_params.get("stroke", "#7A7A7A"),
                    size=_to_number(_text(size_elem, "7")),
                    stroke_width=float(stroke_params.get("stroke-width", 1.0)),
                    opacity=float(stroke_params.get("stroke-opacity", 1.0)),
                )
        elif fill_elem is not None:
            params = _css_params(fill_elem)
            entry["fill"] = params.get("fill", "#FFFFFF")
            entry["fill_opacity"] = float(params.get("fill-opacity", 1.0))

        out.append(entry)
    return out


def _parse_choropleth(
    rules: list[ET.Element],
    layer_name: str,
    style_title: str,
    style_abstract: str,
    units: str,
) -> tuple[ChoroplethModel | None, str | None]:
    range_rules: list[dict[str, Any]] = []
    null_rule: dict[str, Any] | None = None
    attribute: str | None = None
    base_stroke: StrokeModel | None = None

    for rule in rules:
        title = _text(rule.find(_t("sld:Title")))
        filter_elem = rule.find(_t("ogc:Filter"))
        if filter_elem is None:
            return None, "Rule sin Filter (no es coroplético rangos)"

        finfo = _parse_filter(filter_elem)
        symbolizers = _parse_polygon_symbolizers(rule)

        if finfo["kind"] == "null":
            if not symbolizers:
                return None, "Null rule sin symbolizer"
            attribute = attribute or finfo["attribute"]
            background_color = symbolizers[0].get("fill", "#FFFFFF")
            stroke = symbolizers[-1]["stroke"]
            hatch = next(
                (s["hatch"] for s in symbolizers if s.get("graphic") and s.get("hatch")),
                HatchModel(),
            )
            null_rule = {
                "label": title or "Sin dato",
                "background_color": background_color,
                "stroke": stroke,
                "hatch": hatch,
            }
        elif finfo["kind"] == "range":
            if not symbolizers or "fill" not in symbolizers[0]:
                return None, "Range rule sin fill sólido"
            attribute = attribute or finfo["attribute"]
            base_stroke = base_stroke or symbolizers[0]["stroke"]
            range_rules.append({
                "label": title,
                "lower": finfo["lower"],
                "upper": finfo["upper"],
                "upper_inclusive": finfo.get("upper_inclusive", False),
                "color": symbolizers[0]["fill"],
            })
        else:
            return None, "Filter no reconocido (no es rango ni null)"

    if not range_rules or attribute is None:
        return None, "No se detectaron rules de rango"

    cortes: list[float | int | None] = []
    labels: list[str] = []
    colors: list[str] = []

    for idx, rr in enumerate(range_rules):
        lower = rr["lower"]
        upper = rr["upper"]
        if idx == 0:
            cortes.append(lower)
        else:
            prev_upper = range_rules[idx - 1]["upper"]
            if prev_upper != lower:
                return None, (
                    f"Rangos no contiguos en regla {idx + 1}: "
                    f"upper anterior={prev_upper} != lower actual={lower}"
                )
            cortes.append(lower)
        labels.append(rr["label"])
        colors.append(rr["color"])

    cortes.append(range_rules[-1]["upper"])

    null_style_model = (
        NullStyleModel(
            enabled=True,
            label=null_rule["label"],
            background_color=null_rule["background_color"],
            stroke=null_rule["stroke"],
            hatch=null_rule["hatch"],
        )
        if null_rule
        else None
    )

    model = ChoroplethModel(
        layer_name=layer_name,
        style_title=style_title,
        style_abstract=style_abstract,
        units=units,
        attribute=attribute,
        cortes=cortes,
        labels=labels,
        colors=colors,
        stroke=base_stroke or StrokeModel(),
        null_style=null_style_model,
    )
    return model, None


def _parse_text_symbolizer(rule: ET.Element) -> LabelStyleModel | None:
    text_sym = rule.find(_t("sld:TextSymbolizer"))
    if text_sym is None:
        return None

    label_elem = text_sym.find(_t("sld:Label"))
    field = ""
    if label_elem is not None:
        prop = label_elem.find(_t("ogc:PropertyName"))
        field = _text(prop) if prop is not None else _text(label_elem)
    if not field:
        return None

    geometry_function = None
    geometry_property = None
    geom_elem = text_sym.find(_t("sld:Geometry"))
    if geom_elem is not None:
        func = geom_elem.find(_t("ogc:Function"))
        if func is not None:
            geometry_function = func.attrib.get("name")
            inner_prop = func.find(_t("ogc:PropertyName"))
            if inner_prop is not None:
                geometry_property = _text(inner_prop)

    font_elem = text_sym.find(_t("sld:Font"))
    font_params = _css_params(font_elem) if font_elem is not None else {}
    font = FontModel(
        family=font_params.get("font-family", "Arial"),
        size=_to_number(font_params.get("font-size", "11")),
        style=font_params.get("font-style", "normal"),
        weight=font_params.get("font-weight", "normal"),
    )

    fill_elem = text_sym.find(_t("sld:Fill"))
    fill_params = _css_params(fill_elem) if fill_elem is not None else {}
    fill_color = fill_params.get("fill", "#000000")

    halo = None
    halo_elem = text_sym.find(_t("sld:Halo"))
    if halo_elem is not None:
        radius_elem = halo_elem.find(_t("sld:Radius"))
        halo_fill_params = _css_params(halo_elem.find(_t("sld:Fill"))) if halo_elem.find(_t("sld:Fill")) is not None else {}
        halo = HaloModel(
            radius=_to_number(_text(radius_elem, "2")),
            color=halo_fill_params.get("fill", "#FFFFFF"),
        )

    placement = LabelPlacementModel()
    point_placement = text_sym.find(f"{_t('sld:LabelPlacement')}/{_t('sld:PointPlacement')}")
    if point_placement is not None:
        anchor = point_placement.find(_t("sld:AnchorPoint"))
        if anchor is not None:
            placement = LabelPlacementModel(
                anchor_x=float(_text(anchor.find(_t("sld:AnchorPointX")), "0.5")),
                anchor_y=float(_text(anchor.find(_t("sld:AnchorPointY")), "0.5")),
            )

    vendor_options: dict[str, str] = {}
    for vo in text_sym.findall(_t("sld:VendorOption")):
        name = vo.attrib.get("name")
        if name is not None and vo.text is not None:
            vendor_options[name] = vo.text.strip()

    min_scale_elem = rule.find(_t("sld:MinScaleDenominator"))
    max_scale_elem = rule.find(_t("sld:MaxScaleDenominator"))
    min_scale = float(_text(min_scale_elem)) if min_scale_elem is not None else None
    max_scale = float(_text(max_scale_elem)) if max_scale_elem is not None else None

    return LabelStyleModel(
        field=field,
        geometry_function=geometry_function,
        geometry_property=geometry_property,
        font=font,
        fill_color=fill_color,
        halo=halo,
        placement=placement,
        vendor_options=vendor_options,
        min_scale=min_scale,
        max_scale=max_scale,
    )


def _parse_polygon_only_rule(rule: ET.Element) -> PolygonStyleModel | None:
    syms = _parse_polygon_symbolizers(rule)
    if not syms:
        return None
    sym = syms[0]
    if "fill" not in sym and not sym.get("stroke"):
        return None
    rule_name = _text(rule.find(_t("sld:Name"))) or None
    min_scale_elem = rule.find(_t("sld:MinScaleDenominator"))
    max_scale_elem = rule.find(_t("sld:MaxScaleDenominator"))
    return PolygonStyleModel(
        fill_color=sym.get("fill"),
        fill_opacity=sym.get("fill_opacity", 1.0),
        stroke=sym.get("stroke"),
        rule_name=rule_name,
        min_scale=float(_text(min_scale_elem)) if min_scale_elem is not None else None,
        max_scale=float(_text(max_scale_elem)) if max_scale_elem is not None else None,
    )


def _parse_boundary(
    rules: list[ET.Element],
    layer_name: str,
    style_title: str,
) -> tuple[BoundaryModel | None, str | None]:
    polygon: PolygonStyleModel | None = None
    label: LabelStyleModel | None = None

    for rule in rules:
        if rule.find(_t("ogc:Filter")) is not None:
            return None, "Rule con Filter (no es boundary single-style)"

        if rule.find(_t("sld:TextSymbolizer")) is not None:
            if label is not None:
                return None, "Múltiples TextSymbolizer rules; no soportado"
            label = _parse_text_symbolizer(rule)
            if label is None:
                return None, "TextSymbolizer sin Label resoluble"
        elif rule.find(_t("sld:PolygonSymbolizer")) is not None:
            if polygon is not None:
                return None, "Múltiples PolygonSymbolizer rules; no soportado"
            polygon = _parse_polygon_only_rule(rule)
            if polygon is None:
                return None, "PolygonSymbolizer sin fill ni stroke"
        else:
            return None, "Rule con symbolizer no reconocido"

    if polygon is None and label is None:
        return None, "No se detectaron polygon ni label"

    return BoundaryModel(
        layer_name=layer_name,
        style_title=style_title,
        polygon=polygon,
        label=label,
    ), None


def parse_sld(xml_text: str) -> ParseResult:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        return ParseResult(editable=False, raw_xml=xml_text, reason=f"XML inválido: {exc}")

    named = root.find(_t("sld:NamedLayer"))
    if named is None:
        return ParseResult(editable=False, raw_xml=xml_text, reason="Sin NamedLayer")

    layer_name = _text(named.find(_t("sld:Name")))
    user_style = named.find(_t("sld:UserStyle"))
    if user_style is None:
        return ParseResult(editable=False, raw_xml=xml_text, reason="Sin UserStyle")

    style_title = _text(user_style.find(_t("sld:Title")))
    style_abstract = _text(user_style.find(_t("sld:Abstract")))
    units = (
        style_abstract[len(ABSTRACT_PREFIX):]
        if style_abstract.startswith(ABSTRACT_PREFIX)
        else ""
    )

    fts = user_style.find(_t("sld:FeatureTypeStyle"))
    if fts is None:
        return ParseResult(editable=False, raw_xml=xml_text, reason="Sin FeatureTypeStyle")

    rules = fts.findall(_t("sld:Rule"))
    if not rules:
        return ParseResult(editable=False, raw_xml=xml_text, reason="Sin Rules")

    chor_model, chor_reason = _parse_choropleth(
        rules, layer_name, style_title, style_abstract, units,
    )
    if chor_model is not None:
        return ParseResult(
            editable=True, shape="choropleth", model=chor_model, raw_xml=xml_text,
        )

    bound_model, bound_reason = _parse_boundary(rules, layer_name, style_title)
    if bound_model is not None:
        return ParseResult(
            editable=True, shape="boundary", model=bound_model, raw_xml=xml_text,
        )

    return ParseResult(
        editable=False,
        raw_xml=xml_text,
        reason=f"No coincide ningún shape soportado. Coroplético: {chor_reason}. Boundary: {bound_reason}.",
    )
