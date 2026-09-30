from __future__ import annotations

import io

import pytest
from PIL import Image, JpegImagePlugin

from app.services import acervo_thumbnails


def _imagen(formato: str, ancho: int, alto: int) -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (ancho, alto), (200, 120, 40)).save(out, format=formato)
    return out.getvalue()


def _dimensiones(webp: bytes) -> tuple[int, int]:
    with Image.open(io.BytesIO(webp)) as img:
        return img.size


def test_jpeg_que_excede_la_guarda_se_genera_reducido(monkeypatch):
    monkeypatch.setattr(acervo_thumbnails, "MAX_FULL_DECODE_PIXELS", 10_000)

    ancho, alto = _dimensiones(acervo_thumbnails.generate_webp(_imagen("JPEG", 300, 200), 120))

    assert max(ancho, alto) == 120


def test_jpeg_se_decodifica_con_draft_al_ancho_pedido(monkeypatch):
    llamadas = []
    original = JpegImagePlugin.JpegImageFile.draft

    def espia(self, mode, size):
        llamadas.append((mode, size))
        return original(self, mode, size)

    monkeypatch.setattr(JpegImagePlugin.JpegImageFile, "draft", espia)

    acervo_thumbnails.generate_webp(_imagen("JPEG", 800, 600), 400)

    assert llamadas == [("RGB", (400, 400))]


def test_png_que_excede_la_guarda_se_rechaza(monkeypatch):
    monkeypatch.setattr(acervo_thumbnails, "MAX_FULL_DECODE_PIXELS", 10_000)

    with pytest.raises(Image.DecompressionBombError):
        acervo_thumbnails.generate_webp(_imagen("PNG", 300, 200), 120)


def test_png_bajo_la_guarda_sigue_funcionando(monkeypatch):
    monkeypatch.setattr(acervo_thumbnails, "MAX_FULL_DECODE_PIXELS", 10_000)

    ancho, alto = _dimensiones(acervo_thumbnails.generate_webp(_imagen("PNG", 100, 50), 120))

    assert (ancho, alto) == (100, 50)


@pytest.mark.parametrize(
    "ancho,alto",
    [(11_811, 12_992), (14_091, 15_699), (21_600, 28_073)],
)
def test_los_mapas_del_catalogo_se_pueden_abrir(ancho, alto):
    assert ancho * alto <= 2 * Image.MAX_IMAGE_PIXELS
