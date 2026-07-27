from datetime import UTC, datetime

from app.services.sieej.acervo_keys import (
    construir_object_key,
    construir_respaldo_key,
    nombre_archivo,
    sanitizar_segmento,
    segmento_campo,
    valor_archivo,
)

MOMENTO = datetime(2026, 7, 27, 17, 13, 9, tzinfo=UTC)


def _key(**overrides):
    args = {
        "slug": "mundial",
        "envio_id": 2,
        "field_path": "alta_archivos.base_de_datos",
        "filename": "Dirección_de_Integración_Operativa.xlsx",
        "usuario": "egar.villarreal",
        "momento": MOMENTO,
    }
    args.update(overrides)
    return construir_object_key(**args)


def test_ruta_agrupa_por_formulario_envio_y_campo():
    assert _key().split("/")[:3] == [
        "mundial",
        "egar-villarreal-2",
        "alta_archivos.base_de_datos",
    ]


def test_un_formulario_no_periodico_no_gana_un_nivel_de_relleno():
    """El segmento del periodo solo existe si el formulario es periodico; en
    los demas seria un directorio con un unico hijo siempre."""
    assert len(_key().split("/")) == 4
    assert "unico" not in _key()


def test_el_envio_sin_usuario_conserva_solo_el_id():
    assert _key(usuario=None).split("/")[1] == "2"


def test_el_respaldo_json_vive_en_la_carpeta_del_envio():
    key = construir_respaldo_key(
        slug="mundial", envio_id=2, usuario="egar.villarreal"
    )
    assert key == "mundial/egar-villarreal-2/envio.json"


def test_el_respaldo_de_un_periodico_cuelga_de_su_periodo():
    key = construir_respaldo_key(
        slug="censo", envio_id=17, usuario="egar", periodo_clave="2026-01"
    )
    assert key == "censo/egar-17/2026-01/envio.json"


def test_el_archivo_lleva_timestamp_nombre_legible_y_extension():
    archivo = _key().split("/")[-1]
    assert archivo.startswith("20260727T171309Z-")
    assert "direccion-de-integracion-operativa" in archivo
    assert archivo.endswith(".xlsx")


def test_dos_subidas_del_mismo_archivo_no_colisionan():
    assert _key() != _key()


def test_el_periodo_separa_las_capturas_recurrentes():
    partes = _key(periodo_clave="2026-01").split("/")
    assert partes[2] == "2026-01"
    assert len(partes) == 5


def test_el_indice_del_repeater_no_mete_corchetes_en_la_ruta():
    assert segmento_campo("bases_datos[0].diccionario") == "bases_datos-0.diccionario"
    ruta = _key(field_path="bases_datos[12].diccionario")
    assert "bases_datos-12.diccionario" in ruta
    assert "[" not in ruta and "]" not in ruta


def test_sanitiza_acentos_espacios_y_caracteres_raros():
    assert sanitizar_segmento("Año 2026 (final)/dañado") == "ano-2026-final-danado"
    assert sanitizar_segmento("   ") == ""


def test_nombre_sin_extension_no_deja_punto_colgando():
    assert not _key(filename="README").endswith(".")


def test_nombre_vacio_cae_a_un_nombre_generico():
    assert "archivo" in _key(filename=None).split("/")[-1]


def test_valor_archivo_usa_filename_original_como_clave_canonica():
    valor = valor_archivo(
        field_path="alta_archivos.base_de_datos",
        url_publica="/proxy/4/x.xlsx",
        object_key="mundial/unico/envio-2/alta_archivos.base_de_datos/x.xlsx",
        filename="Base.xlsx",
        mime="application/vnd.ms-excel",
        size_bytes=10,
    )
    assert valor["filename_original"] == "Base.xlsx"
    assert valor["object_key"].startswith("mundial/unico/")
    assert nombre_archivo(valor) == "Base.xlsx"


def test_nombre_archivo_tolera_la_forma_vieja():
    assert nombre_archivo({"filename": "viejo.csv"}) == "viejo.csv"
    assert nombre_archivo({"url_publica": "/x"}) is None
    assert nombre_archivo("no-es-dict") is None
