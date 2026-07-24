from datetime import datetime

import pytest

from app.schemas.symbol import SymbolCatalogCategory, SymbolCategoryResponse


def _category(icon: str | None) -> SymbolCategoryResponse:
    now = datetime(2026, 7, 24, 12, 0, 0)
    return SymbolCategoryResponse(
        id=1,
        slug="hidrologia",
        name="Hidrología",
        icon=icon,
        sort_order=0,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.parametrize(
    "icon",
    ["💧", "H", None, ""],
)
def test_icon_no_url_no_expone_icon_url(icon: str | None) -> None:
    assert _category(icon).model_dump(by_alias=True)["iconUrl"] is None


@pytest.mark.parametrize(
    "icon",
    [
        "/acervo/mapalab/simbologia/rio.svg",
        "https://iieg.jalisco.gob.mx/acervo/iieg/leyendas/rio.svg",
        "http://acervo-minio:9000/mapalab/simbologia/rio.png",
    ],
)
def test_icon_url_se_expone_como_icon_url(icon: str) -> None:
    data = _category(icon).model_dump(by_alias=True)
    assert data["iconUrl"] == icon
    assert data["icon"] == icon


def test_catalogo_publico_tambien_expone_icon_url() -> None:
    category = SymbolCatalogCategory(
        id=2,
        slug="relieve",
        name="Relieve",
        icon="/acervo/mapalab/simbologia/cerro.png",
        symbols=[],
    )
    assert category.model_dump(by_alias=True)["iconUrl"] == "/acervo/mapalab/simbologia/cerro.png"
