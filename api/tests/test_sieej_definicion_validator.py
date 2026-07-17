import pytest

from app.services.sieej.definicion_validator import (
    DefinicionInvalidaError,
    definicion_to_validation_rules,
    validar_definicion,
)


def _def_minima(**overrides):
    base = {
        "version": 1,
        "steps": [
            {
                "id": "general",
                "type": "form",
                "title": "General",
                "fields": [
                    {"name": "razon_social", "label": "Razon", "type": "text", "required": True}
                ],
            }
        ],
    }
    base.update(overrides)
    return base


def test_definicion_minima_pasa():
    validar_definicion(_def_minima())


def test_definicion_no_dict_falla():
    with pytest.raises(DefinicionInvalidaError):
        validar_definicion("not-a-dict")


def test_version_invalida_falla():
    with pytest.raises(DefinicionInvalidaError):
        validar_definicion({"version": 0, "steps": [{"id": "x", "type": "form", "title": "x", "fields": [{"name": "a", "label": "A", "type": "text"}]}]})


def test_steps_vacios_falla():
    with pytest.raises(DefinicionInvalidaError):
        validar_definicion({"version": 1, "steps": []})


def test_step_id_duplicado_falla():
    d = {
        "version": 1,
        "steps": [
            {"id": "x", "type": "form", "title": "x", "fields": [{"name": "a", "label": "A", "type": "text"}]},
            {"id": "x", "type": "form", "title": "y", "fields": [{"name": "b", "label": "B", "type": "text"}]},
        ],
    }
    with pytest.raises(DefinicionInvalidaError, match="duplicado"):
        validar_definicion(d)


def test_field_name_duplicado_falla():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "form",
                "title": "x",
                "fields": [
                    {"name": "a", "label": "A", "type": "text"},
                    {"name": "a", "label": "A2", "type": "text"},
                ],
            }
        ],
    }
    with pytest.raises(DefinicionInvalidaError, match="duplicado"):
        validar_definicion(d)


def test_step_type_invalido_falla():
    with pytest.raises(DefinicionInvalidaError):
        validar_definicion({"version": 1, "steps": [{"id": "x", "type": "weird", "title": "x", "fields": []}]})


def test_field_type_desconocido_falla():
    d = _def_minima()
    d["steps"][0]["fields"][0]["type"] = "supercampo"
    with pytest.raises(DefinicionInvalidaError):
        validar_definicion(d)


def test_field_date_range_pasa():
    d = _def_minima()
    d["steps"][0]["fields"].append(
        {"name": "periodo", "label": "Periodo", "type": "date_range"}
    )
    validar_definicion(d)


def test_select_sin_options_ni_catalog_falla():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "form",
                "title": "x",
                "fields": [{"name": "a", "label": "A", "type": "select"}],
            }
        ],
    }
    with pytest.raises(DefinicionInvalidaError, match="options"):
        validar_definicion(d)


def test_select_con_options_y_catalog_falla():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "form",
                "title": "x",
                "fields": [
                    {
                        "name": "a",
                        "label": "A",
                        "type": "select",
                        "options": [{"value": "1", "label": "1"}],
                        "catalog": "unidades_admin",
                    }
                ],
            }
        ],
    }
    with pytest.raises(DefinicionInvalidaError, match="mezclar"):
        validar_definicion(d)


def test_file_excede_cap_absoluto_falla():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "form",
                "title": "x",
                "fields": [
                    {
                        "name": "doc",
                        "label": "Doc",
                        "type": "file",
                        "bucket": "sieej-uploads",
                        "maxSizeMB": 200,
                    }
                ],
            }
        ],
    }
    with pytest.raises(DefinicionInvalidaError, match="cap"):
        validar_definicion(d)


def test_file_sin_bucket_falla():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "form",
                "title": "x",
                "fields": [{"name": "doc", "label": "Doc", "type": "file"}],
            }
        ],
    }
    with pytest.raises(DefinicionInvalidaError, match="bucket"):
        validar_definicion(d)


def test_repeater_min_mayor_que_max_falla():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "repeater",
                "title": "x",
                "minItems": 5,
                "maxItems": 2,
                "fields": [{"name": "a", "label": "A", "type": "text"}],
            }
        ],
    }
    with pytest.raises(DefinicionInvalidaError, match="minItems"):
        validar_definicion(d)


def test_repeater_con_tabs_y_field_tab_invalido_falla():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "repeater",
                "title": "x",
                "tabs": [{"id": "a", "title": "A"}],
                "fields": [{"name": "f", "label": "F", "type": "text", "tab": "z"}],
            }
        ],
    }
    with pytest.raises(DefinicionInvalidaError, match="tab"):
        validar_definicion(d)


def test_show_when_sin_field_falla():
    d = _def_minima()
    d["steps"][0]["fields"].append(
        {"name": "b", "label": "B", "type": "text", "showWhen": {"equals": "true"}}
    )
    with pytest.raises(DefinicionInvalidaError, match="showWhen"):
        validar_definicion(d)


def test_show_when_referencia_field_inexistente_falla():
    d = _def_minima()
    d["steps"][0]["fields"].append(
        {
            "name": "b",
            "label": "B",
            "type": "text",
            "showWhen": {"field": "campo_que_no_existe", "equals": "true"},
        }
    )
    with pytest.raises(DefinicionInvalidaError, match="no existe"):
        validar_definicion(d)


def test_show_when_referencia_otro_step_falla():
    """Una ruta `step.campo` se rechaza: la condicion se evalua solo con los
    datos del step actual, asi que nunca se cumpliria."""
    d = {
        "version": 1,
        "steps": [
            {
                "id": "step1",
                "type": "form",
                "title": "S1",
                "fields": [
                    {"name": "a", "label": "A", "type": "text", "required": True},
                ],
            },
            {
                "id": "step2",
                "type": "form",
                "title": "S2",
                "fields": [
                    {
                        "name": "b",
                        "label": "B",
                        "type": "text",
                        "showWhen": {"field": "step1.a", "equals": "x"},
                    }
                ],
            },
        ],
    }
    with pytest.raises(DefinicionInvalidaError, match="otro step"):
        validar_definicion(d)


def test_show_when_referencia_field_mismo_step_pasa():
    """showWhen puede apuntar a un field del mismo step (sin prefijo step.)."""
    d = _def_minima()
    d["steps"][0]["fields"].append(
        {
            "name": "b",
            "label": "B",
            "type": "text",
            "showWhen": {"field": "razon_social", "equals": "x"},
        }
    )
    validar_definicion(d)


def test_show_when_equals_lista_pasa():
    """`showWhen.equals` puede ser una lista de valores (OR)."""
    d = _def_minima()
    d["steps"][0]["fields"].append(
        {
            "name": "b",
            "label": "B",
            "type": "text",
            "showWhen": {"field": "razon_social", "equals": ["x", "y"]},
        }
    )
    validar_definicion(d)


def test_show_when_equals_lista_vacia_falla():
    d = _def_minima()
    d["steps"][0]["fields"].append(
        {
            "name": "b",
            "label": "B",
            "type": "text",
            "showWhen": {"field": "razon_social", "equals": []},
        }
    )
    with pytest.raises(DefinicionInvalidaError, match="lista vacia"):
        validar_definicion(d)


def test_definicion_completa_wizard_sieej_pasa():
    """Replica los 4 step types del wizard SIEEJ migrado."""
    d = {
        "version": 1,
        "steps": [
            {
                "id": "general",
                "type": "form",
                "title": "General",
                "fields": [
                    {"name": "nombre_ente", "label": "Ente", "type": "text", "required": True},
                    {"name": "unidad_admin_id", "label": "Unidad", "type": "select", "catalog": "unidades_admin", "required": True},
                    {
                        "name": "hay_responsable",
                        "label": "Responsable?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Si"}, {"value": "false", "label": "No"}],
                        "required": True,
                    },
                    {
                        "name": "responsable_nombre",
                        "label": "Nombre",
                        "type": "text",
                        "showWhen": {"field": "hay_responsable", "equals": "true"},
                        "required": True,
                    },
                ],
            },
            {
                "id": "enlaces",
                "type": "repeater",
                "title": "Enlaces",
                "minItems": 1,
                "fields": [
                    {"name": "nombres", "label": "Nombres", "type": "text", "required": True},
                    {"name": "email", "label": "Email", "type": "email", "required": True},
                ],
            },
            {
                "id": "bases_datos",
                "type": "repeater",
                "title": "Bases de datos",
                "minItems": 1,
                "tabs": [{"id": "datos", "title": "Datos"}, {"id": "diccionario", "title": "Diccionario"}],
                "fields": [
                    {"name": "nombre_bd", "label": "Nombre", "type": "text", "required": True, "tab": "datos"},
                    {
                        "name": "diccionario",
                        "label": "Diccionario",
                        "type": "file",
                        "bucket": "sieej-diccionarios",
                        "accept": [".csv", ".xlsx"],
                        "maxSizeMB": 10,
                        "tab": "diccionario",
                    },
                ],
            },
            {"id": "resumen", "type": "summary", "title": "Resumen"},
        ],
    }
    validar_definicion(d)


def test_incomplete_notice_valido_pasa():
    d = _def_minima()
    d["steps"][0]["incompleteNotice"] = {
        "title": "Checklist sin completar",
        "message": "Puedes continuar, pero revisa los puntos pendientes.",
    }
    validar_definicion(d)


def test_incomplete_notice_solo_message_pasa():
    d = _def_minima()
    d["steps"][0]["incompleteNotice"] = {"message": "Revisa los puntos pendientes."}
    validar_definicion(d)


def test_incomplete_notice_no_dict_falla():
    d = _def_minima()
    d["steps"][0]["incompleteNotice"] = "texto plano"
    with pytest.raises(DefinicionInvalidaError, match="incompleteNotice"):
        validar_definicion(d)


def test_incomplete_notice_message_vacio_falla():
    d = _def_minima()
    d["steps"][0]["incompleteNotice"] = {"message": ""}
    with pytest.raises(DefinicionInvalidaError, match="incompleteNotice.message"):
        validar_definicion(d)


def test_validation_rules_required_when():
    d = _def_minima()
    d["steps"][0]["fields"].append(
        {
            "name": "extra",
            "label": "Extra",
            "type": "text",
            "required": True,
            "showWhen": {"field": "razon_social", "equals": "x"},
        }
    )
    rules = definicion_to_validation_rules(d)
    paths = {(r["field_path"], r["rule"]) for r in rules}
    assert ("general.razon_social", "required") in paths
    assert ("general.extra", "required_when") in paths


def test_validation_rules_file_constraints():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "form",
                "title": "x",
                "fields": [
                    {
                        "name": "doc",
                        "label": "Doc",
                        "type": "file",
                        "bucket": "sieej-uploads",
                        "maxSizeMB": 5,
                        "accept": [".pdf"],
                    }
                ],
            }
        ],
    }
    rules = definicion_to_validation_rules(d)
    rule_kinds = {r["rule"] for r in rules}
    assert "maxSizeMB" in rule_kinds
    assert "accept" in rule_kinds
