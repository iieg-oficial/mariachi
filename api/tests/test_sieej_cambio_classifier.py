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
    assert {"step_id": "s1", "field_name": "a", "tipo": "eliminado"} in cambios


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
