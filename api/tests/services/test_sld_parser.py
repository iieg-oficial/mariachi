from __future__ import annotations

from pathlib import Path

import pytest

from app.services.sld_generator import build_boundary_sld_xml, build_sld_xml
from app.services.sld_parser import parse_sld

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "slds"
BOUNDARY_FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "slds_boundary"

SLD_FILES = sorted(FIXTURES_DIR.glob("*.sld"))
BOUNDARY_FILES = sorted(BOUNDARY_FIXTURES_DIR.glob("*.sld"))


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


@pytest.mark.parametrize("sld_path", SLD_FILES, ids=[p.stem for p in SLD_FILES])
def test_parse_succeeds_and_is_editable(sld_path: Path):
    result = parse_sld(_read(sld_path))
    assert result.editable, f"{sld_path.name}: {result.reason}"
    assert result.shape == "choropleth"
    assert result.model is not None
    assert result.model.layer_name
    assert result.model.attribute
    assert len(result.model.cortes) >= 2
    assert len(result.model.labels) == len(result.model.cortes) - 1
    assert len(result.model.colors) == len(result.model.labels)


@pytest.mark.parametrize("sld_path", BOUNDARY_FILES, ids=[p.stem for p in BOUNDARY_FILES])
def test_parse_boundary_succeeds(sld_path: Path):
    result = parse_sld(_read(sld_path))
    assert result.editable, f"{sld_path.name}: {result.reason}"
    assert result.shape == "boundary"
    assert result.model is not None
    assert result.model.layer_name
    assert (result.model.polygon is not None) or (result.model.label is not None)


@pytest.mark.parametrize("sld_path", BOUNDARY_FILES, ids=[p.stem for p in BOUNDARY_FILES])
def test_round_trip_boundary_semantic(sld_path: Path):
    """boundary round-trip: parse → generate → parse → comparar modelos."""
    original = _read(sld_path)
    first = parse_sld(original)
    assert first.editable
    model = first.model
    assert model is not None

    regenerated = build_boundary_sld_xml(
        layer_name=model.layer_name,
        style_title=model.style_title,
        polygon=model.polygon.model_dump() if model.polygon else None,
        label=model.label.model_dump() if model.label else None,
    )

    second = parse_sld(regenerated)
    assert second.editable, f"Re-parse falló: {second.reason}"
    assert second.shape == "boundary"
    assert second.model.model_dump() == model.model_dump(), (
        f"Round-trip diverge semánticamente en {sld_path.name}"
    )


@pytest.mark.parametrize("sld_path", SLD_FILES, ids=[p.stem for p in SLD_FILES])
def test_round_trip_byte_equal(sld_path: Path):
    original = _read(sld_path)
    result = parse_sld(original)
    assert result.editable, f"{sld_path.name} no editable: {result.reason}"
    model = result.model
    assert model is not None

    null_style_dict: dict = {}
    if model.null_style is not None:
        ns = model.null_style
        null_style_dict = {
            "enabled": ns.enabled,
            "label": ns.label,
            "background_color": ns.background_color,
            "stroke": ns.stroke.model_dump(),
            "hatch": ns.hatch.model_dump(),
        }

    regenerated = build_sld_xml(
        layer_name=model.layer_name,
        style_title=model.style_title,
        style_abstract=model.style_abstract,
        attribute=model.attribute,
        cortes=model.cortes,
        labels=model.labels,
        colors=model.colors,
        stroke=model.stroke.model_dump(),
        null_style=null_style_dict,
    )

    assert regenerated.strip() == original.strip(), (
        f"Round-trip diverge para {sld_path.name}"
    )


def test_parse_invalid_xml():
    result = parse_sld("not xml at all <<<")
    assert not result.editable
    assert result.reason and "XML" in result.reason


def test_parse_unrecognized_shape():
    minimal_sld = """<?xml version="1.0" encoding="UTF-8"?>
<sld:StyledLayerDescriptor
  version="1.0.0"
  xmlns:sld="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc">
  <sld:NamedLayer>
    <sld:Name>foo</sld:Name>
    <sld:UserStyle>
      <sld:Title>Foo</sld:Title>
      <sld:FeatureTypeStyle>
        <sld:Rule>
          <sld:Name>r1</sld:Name>
          <sld:Title>r1</sld:Title>
          <sld:PointSymbolizer/>
        </sld:Rule>
      </sld:FeatureTypeStyle>
    </sld:UserStyle>
  </sld:NamedLayer>
</sld:StyledLayerDescriptor>"""
    result = parse_sld(minimal_sld)
    assert not result.editable
