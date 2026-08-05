import copy

from app.services.sieej.cambio_classifier import (
    clasificar_cambio,
    diff_definiciones,
)


def _base():
    return {
        "version": 1,
        "steps": [
            {
                "id": "s1",
                "type": "form",
                "title": "Uno",
                "fields": [
                    {"name": "a", "type": "text", "label": "A", "required": True},
                    {
                        "name": "b",
                        "type": "select",
                        "label": "B",
                        "options": [
                            {"value": "x", "label": "X"},
                            {"value": "y", "label": "Y"},
                        ],
                    },
                ],
            }
        ],
    }


def _con(mutador):
    d = copy.deepcopy(_base())
    mutador(d)
    return d


def test_cambio_label_es_menor():
    d = _con(lambda x: x["steps"][0]["fields"][0].update({"label": "A editada"}))
    assert clasificar_cambio(_base(), d) == "menor"


def test_cambio_layout_es_menor_y_no_aparece_en_diff():
    d = _con(lambda x: x["steps"][0]["fields"][0].update({"layout": {"colSpan": 2}}))
    assert clasificar_cambio(_base(), d) == "menor"
    assert diff_definiciones(_base(), d) == []


def test_agregar_campo_opcional_es_menor():
    d = _con(
        lambda x: x["steps"][0]["fields"].append(
            {"name": "c", "type": "text", "label": "C"}
        )
    )
    assert clasificar_cambio(_base(), d) == "menor"


def test_agregar_opcion_es_menor():
    d = _con(
        lambda x: x["steps"][0]["fields"][1]["options"].append(
            {"value": "z", "label": "Z"}
        )
    )
    assert clasificar_cambio(_base(), d) == "menor"


def test_agregar_campo_obligatorio_rompe():
    d = _con(
        lambda x: x["steps"][0]["fields"].append(
            {"name": "c", "type": "text", "label": "C", "required": True}
        )
    )
    assert clasificar_cambio(_base(), d) == "rompe"


def test_eliminar_campo_rompe():
    d = _con(lambda x: x["steps"][0]["fields"].pop(0))
    assert clasificar_cambio(_base(), d) == "rompe"
    cambios = diff_definiciones(_base(), d)
    eliminado = next(c for c in cambios if c["field_name"] == "a")
    assert eliminado["step_id"] == "s1"
    assert eliminado["tipo"] == "eliminado"
    assert eliminado["field_label"] == "A"
    assert eliminado["step_title"] == "Uno"


def test_diff_de_campo_modificado_trae_el_label_nuevo():
    d = _con(lambda x: x["steps"][0]["fields"][0].update({"label": "A editada"}))
    cambios = diff_definiciones(_base(), d)
    modificado = next(c for c in cambios if c["tipo"] == "modificado")
    assert modificado["field_label"] == "A editada"
    assert modificado["step_title"] == "Uno"


def test_diff_de_step_eliminado_trae_el_titulo_viejo():
    def _quitar(x):
        x["steps"] = [
            {
                "id": "s2",
                "type": "form",
                "title": "Dos",
                "fields": [{"name": "z", "type": "text", "label": "Z"}],
            }
        ]

    cambios = diff_definiciones(_base(), _con(_quitar))
    step = next(
        c for c in cambios if c["step_id"] == "s1" and c["field_name"] is None
    )
    assert step["tipo"] == "eliminado"
    assert step["step_title"] == "Uno"
    assert step["field_label"] is None


def test_quitar_opcion_rompe():
    d = _con(
        lambda x: x["steps"][0]["fields"][1].update(
            {"options": [{"value": "x", "label": "X"}]}
        )
    )
    assert clasificar_cambio(_base(), d) == "rompe"


def test_opcional_a_obligatorio_rompe():
    d = _con(lambda x: x["steps"][0]["fields"][1].update({"required": True}))
    assert clasificar_cambio(_base(), d) == "rompe"


def test_validacion_mas_estricta_rompe():
    d = _con(
        lambda x: x["steps"][0]["fields"][0].update({"validation": {"minLength": 5}})
    )
    assert clasificar_cambio(_base(), d) == "rompe"


def test_cambiar_tipo_rompe():
    d = _con(lambda x: x["steps"][0]["fields"][0].update({"type": "number"}))
    assert clasificar_cambio(_base(), d) == "rompe"


def test_eliminar_step_rompe():
    d = _con(lambda x: x["steps"].clear() or x["steps"].append(_base()["steps"][0]))

    def _quitar(x):
        x["steps"] = [
            {
                "id": "s2",
                "type": "form",
                "title": "Dos",
                "fields": [{"name": "z", "type": "text", "label": "Z"}],
            }
        ]

    d = _con(_quitar)
    assert clasificar_cambio(_base(), d) == "rompe"


def test_agregar_step_nuevo_opcional_es_menor():
    def _add(x):
        x["steps"].append(
            {
                "id": "s2",
                "type": "form",
                "title": "Dos",
                "fields": [{"name": "z", "type": "text", "label": "Z"}],
            }
        )

    d = _con(_add)
    assert clasificar_cambio(_base(), d) == "menor"


def _con_fecha(validation=None):
    d = copy.deepcopy(_base())
    campo = {"name": "f", "type": "date", "label": "F"}
    if validation is not None:
        campo["validation"] = validation
    d["steps"][0]["fields"].append(campo)
    return d


def test_agregar_limite_de_fecha_rompe():
    assert clasificar_cambio(_con_fecha(), _con_fecha({"maxDate": "hoy"})) == "rompe"


def test_quitar_limite_de_fecha_es_menor():
    assert clasificar_cambio(_con_fecha({"maxDate": "hoy"}), _con_fecha()) == "menor"


def test_relajar_limite_fijo_es_menor():
    viejo = _con_fecha({"maxDate": "2026-01-01"})
    nuevo = _con_fecha({"maxDate": "2030-01-01"})
    assert clasificar_cambio(viejo, nuevo) == "menor"


def test_endurecer_limite_fijo_rompe():
    viejo = _con_fecha({"minDate": "2020-01-01"})
    nuevo = _con_fecha({"minDate": "2024-01-01"})
    assert clasificar_cambio(viejo, nuevo) == "rompe"


def test_cambiar_limite_fijo_por_hoy_rompe():
    viejo = _con_fecha({"maxDate": "2030-01-01"})
    nuevo = _con_fecha({"maxDate": "hoy"})
    assert clasificar_cambio(viejo, nuevo) == "rompe"
