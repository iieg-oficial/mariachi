import json
from pathlib import Path

import pytest

from app.services.sieej.compat import normalizar_definicion, requiere_normalizacion
from app.services.sieej.datos_validator import DatosInvalidosError, validar_datos
from app.services.sieej.definicion_validator import (
    DefinicionInvalidaError,
    validar_definicion,
)

LEGACY_DIR = Path(__file__).parent / "fixtures" / "sieej" / "legacy"


def _legacy_files():
    return sorted(LEGACY_DIR.glob("*.json"))


def _cargar(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _fields(definicion: dict, step_id: str) -> dict[str, dict]:
    step = next(s for s in definicion["steps"] if s["id"] == step_id)
    return {f["name"]: f for f in step["fields"]}


@pytest.mark.parametrize("path", _legacy_files(), ids=lambda p: p.stem)
def test_definicion_legada_pasa_el_contrato_vigente(path):
    """Toda definicion historica normalizada debe validar. Si este test falla
    tras endurecer el validador, agrega la regla de compat en `compat.py`."""
    validar_definicion(normalizar_definicion(_cargar(path)))


@pytest.mark.parametrize("path", _legacy_files(), ids=lambda p: p.stem)
def test_normalizar_es_idempotente(path):
    una = normalizar_definicion(_cargar(path))
    assert normalizar_definicion(una) == una


def test_fixture_levantamiento_no_valida_sin_normalizar():
    original = _cargar(LEGACY_DIR / "sieej_levantamiento_v1.json")
    with pytest.raises(DefinicionInvalidaError):
        validar_definicion(original)
    assert requiere_normalizacion(original)


def test_tipos_absorbidos_se_convierten_en_text_con_pattern():
    definicion = normalizar_definicion(
        _cargar(LEGACY_DIR / "sieej_levantamiento_v1.json")
    )
    fields = _fields(definicion, "documentacion_institucional")
    correo = fields["correo_electronico_del_responsable_del_conjunto_de_datos"]
    telefono = fields["telefono_del_responsable_del_conjunto_de_datos"]
    assert correo["type"] == "text"
    assert correo["validation"]["pattern"]
    assert telefono["type"] == "text"
    assert telefono["validation"]["pattern"] == r"^\d{10}$"


def test_pattern_propio_no_se_pisa_al_absorber_el_tipo():
    definicion = normalizar_definicion(
        {
            "version": 1,
            "steps": [
                {
                    "id": "s",
                    "type": "form",
                    "title": "S",
                    "fields": [
                        {
                            "name": "tel",
                            "label": "Tel",
                            "type": "tel",
                            "validation": {"pattern": "^33\\d{8}$"},
                        }
                    ],
                }
            ],
        }
    )
    assert definicion["steps"][0]["fields"][0]["validation"]["pattern"] == "^33\\d{8}$"


def test_spacer_info_sin_label_se_elimina():
    definicion = normalizar_definicion(
        _cargar(LEGACY_DIR / "sieej_levantamiento_v1.json")
    )
    assert "_" not in _fields(definicion, "documentacion_institucional")


def test_campos_sin_tab_caen_en_la_primera_pestana():
    definicion = normalizar_definicion(
        _cargar(LEGACY_DIR / "sieej_levantamiento_v1.json")
    )
    fields = _fields(definicion, "dataset_y_edicion_dataset")
    assert fields["se_cuenta_con_un_diccionario_de_datos"]["tab"] == "metodologia"
    assert fields["anada_el_diccionario_de_datos"]["tab"] == "metodologia"


def _def_con_field(field: dict, **step_extra) -> dict:
    step = {"id": "s", "type": "form", "title": "S", "fields": [field]}
    step.update(step_extra)
    return {"version": 1, "steps": [step]}


def test_tipo_desconocido_cae_a_texto():
    definicion = normalizar_definicion(
        _def_con_field({"name": "x", "label": "X", "type": "rating"})
    )
    assert definicion["steps"][0]["fields"][0]["type"] == "text"
    validar_definicion(definicion)


def test_select_sin_opciones_ni_catalogo_cae_a_texto():
    definicion = normalizar_definicion(
        _def_con_field({"name": "x", "label": "X", "type": "select"})
    )
    assert definicion["steps"][0]["fields"][0]["type"] == "text"
    validar_definicion(definicion)


def test_file_sin_bucket_toma_el_bucket_por_defecto():
    definicion = normalizar_definicion(
        _def_con_field({"name": "x", "label": "X", "type": "file"})
    )
    assert definicion["steps"][0]["fields"][0]["bucket"] == "sieej"
    validar_definicion(definicion)


def test_colspan_fuera_de_rango_se_acota():
    definicion = normalizar_definicion(
        _def_con_field(
            {"name": "x", "label": "X", "type": "text", "layout": {"colSpan": 6}}
        )
    )
    assert definicion["steps"][0]["fields"][0]["layout"]["colSpan"] == 3
    validar_definicion(definicion)


def test_show_when_huerfano_se_elimina():
    definicion = normalizar_definicion(
        _def_con_field(
            {
                "name": "x",
                "label": "X",
                "type": "text",
                "showWhen": {"field": "otro_step.campo", "equals": "true"},
            }
        )
    )
    assert "showWhen" not in definicion["steps"][0]["fields"][0]
    validar_definicion(definicion)


def test_show_when_a_campo_inexistente_se_elimina():
    definicion = normalizar_definicion(
        _def_con_field(
            {
                "name": "x",
                "label": "X",
                "type": "text",
                "showWhen": {"field": "no_existe", "equals": "true"},
            }
        )
    )
    assert "showWhen" not in definicion["steps"][0]["fields"][0]
    validar_definicion(definicion)


def test_campo_sin_label_hereda_el_name():
    definicion = normalizar_definicion(
        _def_con_field({"name": "razon_social", "type": "text"})
    )
    assert definicion["steps"][0]["fields"][0]["label"] == "razon_social"
    validar_definicion(definicion)


def test_max_size_mb_por_encima_del_cap_se_acota():
    definicion = normalizar_definicion(
        _def_con_field(
            {
                "name": "x",
                "label": "X",
                "type": "file",
                "bucket": "sieej",
                "maxSizeMB": 500,
            }
        )
    )
    assert definicion["steps"][0]["fields"][0]["maxSizeMB"] == 100
    validar_definicion(definicion)


def test_pattern_invalido_se_descarta():
    definicion = normalizar_definicion(
        _def_con_field(
            {
                "name": "x",
                "label": "X",
                "type": "text",
                "validation": {"pattern": "^[a-z"},
            }
        )
    )
    assert "validation" not in definicion["steps"][0]["fields"][0]
    validar_definicion(definicion)


def test_validar_datos_acepta_un_snapshot_legado():
    """Un envio en curso guardado con la definicion vieja no debe romperse
    con `tipo desconocido` tras el deploy."""
    snapshot = _cargar(LEGACY_DIR / "sieej_levantamiento_v1.json")
    datos = {
        "documentacion_institucional": {
            "correo_electronico_del_responsable_del_conjunto_de_datos": "a@b.com",
            "telefono_del_responsable_del_conjunto_de_datos": "3312345678",
        }
    }
    validar_datos(snapshot, datos, estricto=False)


def test_validar_datos_sigue_reportando_errores_reales():
    snapshot = _cargar(LEGACY_DIR / "sieej_levantamiento_v1.json")
    datos = {
        "documentacion_institucional": {
            "correo_electronico_del_responsable_del_conjunto_de_datos": "no-es-correo",
        }
    }
    with pytest.raises(DatosInvalidosError):
        validar_datos(snapshot, datos, estricto=False)
