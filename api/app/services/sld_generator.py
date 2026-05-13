from __future__ import annotations

import html
from typing import Any

Number = int | float
Cut = Number | None


GEOMETRY_BLOCK = """
        <sld:Geometry>
          <ogc:Function name="property">
            <ogc:Function name="env">
              <ogc:Literal>geom</ogc:Literal>
              <ogc:Literal>geom_iieg</ogc:Literal>
            </ogc:Function>
          </ogc:Function>
        </sld:Geometry>
""".rstrip()


def _escape_text(value: Any) -> str:
    return html.escape(str(value), quote=False)


def _num_to_literal(x: Number) -> str:
    if isinstance(x, int):
        return str(x)

    xf = float(x)
    if xf.is_integer():
        return str(int(xf))

    s = str(x)
    if "e" in s or "E" in s:
        s = f"{xf:.12f}".rstrip("0").rstrip(".")
    return s


def _polygon_symbolizer(fill_hex: str, stroke: dict[str, Any]) -> str:
    stroke_color = stroke.get("color", "#FFFFFF")
    stroke_width = stroke.get("width", 0.35)
    stroke_opacity = stroke.get("opacity", 1.0)
    stroke_linejoin = stroke.get("linejoin", "bevel")

    return f"""
      <sld:PolygonSymbolizer>
{GEOMETRY_BLOCK}
        <sld:Fill>
          <sld:CssParameter name="fill">{fill_hex}</sld:CssParameter>
          <sld:CssParameter name="fill-opacity">1.0</sld:CssParameter>
        </sld:Fill>
        <sld:Stroke>
          <sld:CssParameter name="stroke">{stroke_color}</sld:CssParameter>
          <sld:CssParameter name="stroke-width">{stroke_width}</sld:CssParameter>
          <sld:CssParameter name="stroke-opacity">{stroke_opacity}</sld:CssParameter>
          <sld:CssParameter name="stroke-linejoin">{stroke_linejoin}</sld:CssParameter>
        </sld:Stroke>
      </sld:PolygonSymbolizer>
    """.rstrip()


def _null_rule(attribute: str, null_style: dict[str, Any]) -> str:
    if not null_style or not bool(null_style.get("enabled", True)):
        return ""

    label = (null_style.get("label") or "Sin dato").strip()
    background_color = (null_style.get("background_color") or "#FFFFFF").strip()

    null_stroke = null_style.get("stroke", {}) or {}
    null_stroke_color = (null_stroke.get("color") or "#7A7A7A").strip()
    null_stroke_width = null_stroke.get("width", 0.35)
    null_stroke_opacity = null_stroke.get("opacity", 1.0)
    null_stroke_linejoin = null_stroke.get("linejoin", "bevel")

    hatch = null_style.get("hatch", {}) or {}
    hatch_well_known_name = (hatch.get("well_known_name") or "shape://times").strip()
    hatch_color = (hatch.get("color") or "#7A7A7A").strip()
    hatch_size = hatch.get("size", 7)
    hatch_stroke_width = hatch.get("stroke_width", 1.0)
    hatch_opacity = hatch.get("opacity", 1.0)

    return f"""
    <sld:Rule>
      <sld:Name>null</sld:Name>
      <sld:Title>{_escape_text(label)}</sld:Title>
      <ogc:Filter>
        <ogc:PropertyIsNull>
          <ogc:PropertyName>{_escape_text(attribute)}</ogc:PropertyName>
        </ogc:PropertyIsNull>
      </ogc:Filter>

      <sld:PolygonSymbolizer>
{GEOMETRY_BLOCK}
        <sld:Fill>
          <sld:CssParameter name="fill">{background_color}</sld:CssParameter>
          <sld:CssParameter name="fill-opacity">1.0</sld:CssParameter>
        </sld:Fill>
      </sld:PolygonSymbolizer>

      <sld:PolygonSymbolizer>
{GEOMETRY_BLOCK}
        <sld:Fill>
          <sld:GraphicFill>
            <sld:Graphic>
              <sld:Mark>
                <sld:WellKnownName>{_escape_text(hatch_well_known_name)}</sld:WellKnownName>
                <sld:Stroke>
                  <sld:CssParameter name="stroke">{hatch_color}</sld:CssParameter>
                  <sld:CssParameter name="stroke-width">{hatch_stroke_width}</sld:CssParameter>
                  <sld:CssParameter name="stroke-opacity">{hatch_opacity}</sld:CssParameter>
                </sld:Stroke>
              </sld:Mark>
              <sld:Size>{hatch_size}</sld:Size>
            </sld:Graphic>
          </sld:GraphicFill>
        </sld:Fill>

        <sld:Stroke>
          <sld:CssParameter name="stroke">{null_stroke_color}</sld:CssParameter>
          <sld:CssParameter name="stroke-width">{null_stroke_width}</sld:CssParameter>
          <sld:CssParameter name="stroke-opacity">{null_stroke_opacity}</sld:CssParameter>
          <sld:CssParameter name="stroke-linejoin">{null_stroke_linejoin}</sld:CssParameter>
        </sld:Stroke>
      </sld:PolygonSymbolizer>
    </sld:Rule>
    """.rstrip()


def _range_rule(
    *,
    attribute: str,
    lower: Cut,
    upper: Cut,
    label: str,
    color: str,
    stroke: dict[str, Any],
    idx: int,
    upper_inclusive: bool = False,
) -> str:
    parts = []

    if lower is not None:
        parts.append(f"""
          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>{_escape_text(attribute)}</ogc:PropertyName>
            <ogc:Literal>{_num_to_literal(lower)}</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>
        """.rstrip())

    if upper is not None:
        upper_tag = "PropertyIsLessThanOrEqualTo" if upper_inclusive else "PropertyIsLessThan"
        parts.append(f"""
          <ogc:{upper_tag}>
            <ogc:PropertyName>{_escape_text(attribute)}</ogc:PropertyName>
            <ogc:Literal>{_num_to_literal(upper)}</ogc:Literal>
          </ogc:{upper_tag}>
        """.rstrip())

    if len(parts) == 1:
        filter_block = parts[0]
    else:
        filter_block = f"""
        <ogc:And>
{parts[0]}
{parts[1]}
        </ogc:And>
        """.rstrip()

    return f"""
    <sld:Rule>
      <sld:Name>c{idx + 1}</sld:Name>
      <sld:Title>{_escape_text(label)}</sld:Title>
      <ogc:Filter>
{filter_block}
      </ogc:Filter>
{_polygon_symbolizer(color, stroke)}
    </sld:Rule>
    """.rstrip()


def build_sld_xml(
    *,
    layer_name: str,
    style_title: str,
    style_abstract: str,
    attribute: str,
    cortes: list[Cut],
    labels: list[str],
    colors: list[str],
    stroke: dict[str, Any],
    null_style: dict[str, Any],
) -> str:
    if not isinstance(cortes, list) or len(cortes) < 2:
        raise ValueError("cortes debe ser una lista con al menos 2 elementos.")
    if len(labels) != len(cortes) - 1:
        raise ValueError("labels debe tener len(cortes)-1 elementos.")
    if len(colors) != len(labels):
        raise ValueError("colors debe tener la misma longitud que labels.")

    rules: list[str] = []
    n_rules = len(labels)

    for idx, (label, color) in enumerate(zip(labels, colors)):
        lower = cortes[idx]
        upper = cortes[idx + 1]
        is_last = idx == n_rules - 1

        rules.append(
            _range_rule(
                attribute=attribute,
                lower=lower,
                upper=upper,
                label=label,
                color=color,
                stroke=stroke,
                idx=idx,
                upper_inclusive=(is_last and upper is not None),
            )
        )

    null_rule_xml = _null_rule(attribute, null_style)
    if null_rule_xml:
        rules.append(null_rule_xml)

    abstract_block = (
        f"<sld:Abstract>{_escape_text(style_abstract)}</sld:Abstract>"
        if style_abstract
        else ""
    )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<sld:StyledLayerDescriptor
  version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:sld="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <sld:NamedLayer>
    <sld:Name>{_escape_text(layer_name)}</sld:Name>

    <sld:UserStyle>
      <sld:Title>{_escape_text(style_title)}</sld:Title>
      {abstract_block}

      <sld:FeatureTypeStyle>
{chr(10).join(rules)}
      </sld:FeatureTypeStyle>

    </sld:UserStyle>
  </sld:NamedLayer>
</sld:StyledLayerDescriptor>
""".rstrip()


def _num(x: Number) -> str:
    if isinstance(x, int):
        return str(x)
    xf = float(x)
    if xf.is_integer():
        return str(int(xf))
    return str(x)


def _polygon_block(polygon: dict[str, Any]) -> str:
    fill_color = polygon.get("fill_color")
    fill_opacity = polygon.get("fill_opacity", 1.0)
    stroke = polygon.get("stroke") or {}

    fill_xml = ""
    if fill_color:
        fill_xml = f"""<sld:Fill><sld:CssParameter name="fill">{fill_color}</sld:CssParameter><sld:CssParameter name="fill-opacity">{_num(fill_opacity)}</sld:CssParameter></sld:Fill>"""

    stroke_xml = ""
    if stroke:
        stroke_color = stroke.get("color", "#FFFFFF")
        stroke_width = stroke.get("width", 0.35)
        stroke_opacity = stroke.get("opacity", 1.0)
        stroke_linejoin = stroke.get("linejoin", "bevel")
        stroke_xml = (
            f"<sld:Stroke>"
            f'<sld:CssParameter name="stroke">{stroke_color}</sld:CssParameter>'
            f'<sld:CssParameter name="stroke-linejoin">{stroke_linejoin}</sld:CssParameter>'
            f'<sld:CssParameter name="stroke-width">{_num(stroke_width)}</sld:CssParameter>'
            f'<sld:CssParameter name="stroke-opacity">{_num(stroke_opacity)}</sld:CssParameter>'
            f"</sld:Stroke>"
        )

    return f"<sld:PolygonSymbolizer>{fill_xml}{stroke_xml}</sld:PolygonSymbolizer>"


def _label_block(label: dict[str, Any]) -> str:
    field = label["field"]
    geom_func = label.get("geometry_function")
    geom_prop = label.get("geometry_property")
    font = label.get("font") or {}
    halo = label.get("halo")
    placement = label.get("placement") or {}
    fill_color = label.get("fill_color", "#000000")
    vendor_options = label.get("vendor_options") or {}

    geometry_xml = ""
    if geom_func and geom_prop:
        geometry_xml = (
            f"<sld:Geometry>"
            f'<ogc:Function name="{geom_func}">'
            f"<ogc:PropertyName>{_escape_text(geom_prop)}</ogc:PropertyName>"
            f"</ogc:Function>"
            f"</sld:Geometry>"
        )

    label_xml = (
        f"<sld:Label><ogc:PropertyName>{_escape_text(field)}</ogc:PropertyName></sld:Label>"
    )

    font_xml = (
        f"<sld:Font>"
        f'<sld:CssParameter name="font-family">{font.get("family", "Arial")}</sld:CssParameter>'
        f'<sld:CssParameter name="font-size">{_num(font.get("size", 11))}</sld:CssParameter>'
        f'<sld:CssParameter name="font-style">{font.get("style", "normal")}</sld:CssParameter>'
        f'<sld:CssParameter name="font-weight">{font.get("weight", "normal")}</sld:CssParameter>'
        f"</sld:Font>"
    )

    placement_xml = (
        f"<sld:LabelPlacement><sld:PointPlacement>"
        f"<sld:AnchorPoint>"
        f"<sld:AnchorPointX>{_num(placement.get('anchor_x', 0.5))}</sld:AnchorPointX>"
        f"<sld:AnchorPointY>{_num(placement.get('anchor_y', 0.5))}</sld:AnchorPointY>"
        f"</sld:AnchorPoint>"
        f"</sld:PointPlacement></sld:LabelPlacement>"
    )

    halo_xml = ""
    if halo:
        halo_xml = (
            f"<sld:Halo>"
            f"<sld:Radius>{_num(halo.get('radius', 2))}</sld:Radius>"
            f'<sld:Fill><sld:CssParameter name="fill">{halo.get("color", "#FFFFFF")}</sld:CssParameter></sld:Fill>'
            f"</sld:Halo>"
        )

    fill_xml = (
        f'<sld:Fill><sld:CssParameter name="fill">{fill_color}</sld:CssParameter></sld:Fill>'
    )

    vendor_xml = "".join(
        f'<sld:VendorOption name="{name}">{value}</sld:VendorOption>'
        for name, value in vendor_options.items()
    )

    return (
        f"<sld:TextSymbolizer>"
        f"{geometry_xml}{label_xml}{font_xml}{placement_xml}{halo_xml}{fill_xml}{vendor_xml}"
        f"</sld:TextSymbolizer>"
    )


def _scale_blocks(min_scale: Any, max_scale: Any) -> str:
    parts = []
    if min_scale is not None:
        parts.append(f"<sld:MinScaleDenominator>{min_scale}</sld:MinScaleDenominator>")
    if max_scale is not None:
        parts.append(f"<sld:MaxScaleDenominator>{max_scale}</sld:MaxScaleDenominator>")
    return "".join(parts)


def _point_block(point: dict[str, Any]) -> str:
    graphic_url = point.get("graphic_url") or ""
    fmt = point.get("graphic_format") or "image/png"
    size = point.get("size", 16)
    rotation = point.get("rotation", 0)
    opacity = point.get("opacity", 1.0)
    return (
        f"<sld:PointSymbolizer>"
        f"<sld:Graphic>"
        f"<sld:ExternalGraphic>"
        f'<sld:OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" '
        f'xlink:href="{_escape_text(graphic_url)}"/>'
        f"<sld:Format>{_escape_text(fmt)}</sld:Format>"
        f"</sld:ExternalGraphic>"
        f"<sld:Opacity>{_num(opacity)}</sld:Opacity>"
        f"<sld:Size>{_num(size)}</sld:Size>"
        f"<sld:Rotation>{_num(rotation)}</sld:Rotation>"
        f"</sld:Graphic>"
        f"</sld:PointSymbolizer>"
    )


def build_point_sld_xml(
    *,
    layer_name: str,
    style_title: str = "",
    point: dict[str, Any] | None = None,
    label: dict[str, Any] | None = None,
) -> str:
    if point is None and label is None:
        raise ValueError("point necesita al menos un graphic o label")

    rules: list[str] = []
    if point:
        if not point.get("graphic_url"):
            raise ValueError("point requiere graphic_url")
        rules.append(f"<sld:Rule>{_point_block(point)}</sld:Rule>")
    if label:
        scales_xml = _scale_blocks(label.get("min_scale"), label.get("max_scale"))
        rules.append(f"<sld:Rule>{scales_xml}{_label_block(label)}</sld:Rule>")

    title_xml = (
        f"<sld:Name>{_escape_text(layer_name)}</sld:Name>"
        + (f"<sld:Title>{_escape_text(style_title)}</sld:Title>" if style_title else "")
    )

    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f'<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" xmlns="http://www.opengis.net/sld" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0.0">'
        f"<sld:NamedLayer>"
        f"<sld:Name>{_escape_text(layer_name)}</sld:Name>"
        f"<sld:UserStyle>{title_xml}<sld:FeatureTypeStyle>{''.join(rules)}</sld:FeatureTypeStyle></sld:UserStyle>"
        f"</sld:NamedLayer>"
        f"</sld:StyledLayerDescriptor>"
    )


def build_boundary_sld_xml(
    *,
    layer_name: str,
    style_title: str = "",
    polygon: dict[str, Any] | None = None,
    label: dict[str, Any] | None = None,
) -> str:
    if polygon is None and label is None:
        raise ValueError("boundary necesita al menos polygon o label")

    rules: list[str] = []
    if polygon:
        rule_name = polygon.get("rule_name")
        rule_name_xml = f"<sld:Name>{_escape_text(rule_name)}</sld:Name>" if rule_name else ""
        scales_xml = _scale_blocks(polygon.get("min_scale"), polygon.get("max_scale"))
        rules.append(f"<sld:Rule>{rule_name_xml}{scales_xml}{_polygon_block(polygon)}</sld:Rule>")
    if label:
        scales_xml = _scale_blocks(label.get("min_scale"), label.get("max_scale"))
        rules.append(f"<sld:Rule>{scales_xml}{_label_block(label)}</sld:Rule>")

    title_xml = (
        f"<sld:Name>{_escape_text(layer_name)}</sld:Name>"
        + (f"<sld:Title>{_escape_text(style_title)}</sld:Title>" if style_title else "")
    )

    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f'<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" xmlns="http://www.opengis.net/sld" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" version="1.0.0">'
        f"<sld:NamedLayer>"
        f"<sld:Name>{_escape_text(layer_name)}</sld:Name>"
        f"<sld:UserStyle>{title_xml}<sld:FeatureTypeStyle>{''.join(rules)}</sld:FeatureTypeStyle></sld:UserStyle>"
        f"</sld:NamedLayer>"
        f"</sld:StyledLayerDescriptor>"
    )
