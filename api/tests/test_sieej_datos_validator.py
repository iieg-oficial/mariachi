import pytest

from app.services.sieej.datos_validator import DatosInvalidosError, validar_datos


def _def_form_simple():
    return {
        "version": 1,
        "steps": [
            {
                "id": "general",
                "type": "form",
                "title": "General",
                "fields": [
                    {"name": "nombre", "label": "Nombre", "type": "text", "required": True},
                    {
                        "name": "edad",
                        "label": "Edad",
                        "type": "number",
                        "validation": {"min": 0, "max": 150},
                    },
                    {
                        "name": "email",
                        "label": "Email",
                        "type": "text",
                        "validation": {
                            "pattern": r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
                            "patternMessage": "correo invalido",
                        },
                    },
                    {
                        "name": "color",
                        "label": "Color",
                        "type": "radio",
                        "options": [
                            {"value": "rojo", "label": "Rojo"},
                            {"value": "azul", "label": "Azul"},
                        ],
                    },
                ],
            }
        ],
    }


def test_datos_validos_pasa():
    datos = {"general": {"nombre": "Edgar", "edad": 32, "email": "e@x.com", "color": "rojo"}}
    validar_datos(_def_form_simple(), datos, estricto=True)


def test_required_faltante_falla_en_estricto():
    datos = {"general": {"edad": 30}}
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(_def_form_simple(), datos, estricto=True)
    paths = {e["path"] for e in exc.value.errores}
    assert "general.nombre" in paths


def test_required_faltante_pasa_en_borrador():
    datos = {"general": {"edad": 30}}
    validar_datos(_def_form_simple(), datos, estricto=False)


def test_email_invalido_falla():
    datos = {"general": {"nombre": "x", "email": "no-es-email"}}
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(_def_form_simple(), datos, estricto=True)
    paths = {e["path"] for e in exc.value.errores}
    assert "general.email" in paths


def test_number_fuera_de_rango_falla():
    datos = {"general": {"nombre": "x", "edad": 200}}
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(_def_form_simple(), datos, estricto=True)
    paths = {e["path"] for e in exc.value.errores}
    assert "general.edad" in paths


def test_radio_valor_fuera_de_options_falla():
    datos = {"general": {"nombre": "x", "color": "verde"}}
    with pytest.raises(DatosInvalidosError):
        validar_datos(_def_form_simple(), datos, estricto=True)


def test_show_when_omite_required():
    """Si showWhen no se cumple, el campo no es exigible aunque sea required."""
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "form",
                "title": "x",
                "fields": [
                    {
                        "name": "tiene",
                        "label": "Tiene?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Si"}, {"value": "false", "label": "No"}],
                        "required": True,
                    },
                    {
                        "name": "detalle",
                        "label": "Detalle",
                        "type": "text",
                        "required": True,
                        "showWhen": {"field": "tiene", "equals": "true"},
                    },
                ],
            }
        ],
    }
    validar_datos(d, {"x": {"tiene": "false"}}, estricto=True)


def test_show_when_si_se_cumple_exige_required():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "form",
                "title": "x",
                "fields": [
                    {
                        "name": "tiene",
                        "label": "Tiene?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Si"}, {"value": "false", "label": "No"}],
                        "required": True,
                    },
                    {
                        "name": "detalle",
                        "label": "Detalle",
                        "type": "text",
                        "required": True,
                        "showWhen": {"field": "tiene", "equals": "true"},
                    },
                ],
            }
        ],
    }
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(d, {"x": {"tiene": "true"}}, estricto=True)
    paths = {e["path"] for e in exc.value.errores}
    assert "x.detalle" in paths


def _def_show_when_lista():
    return {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "form",
                "title": "x",
                "fields": [
                    {
                        "name": "categoria",
                        "label": "Categoria",
                        "type": "select",
                        "options": [
                            {"value": "salud", "label": "Salud"},
                            {"value": "seguridad", "label": "Seguridad"},
                            {"value": "empleo", "label": "Empleo"},
                        ],
                        "required": True,
                    },
                    {
                        "name": "detalle",
                        "label": "Detalle",
                        "type": "text",
                        "required": True,
                        "showWhen": {
                            "field": "categoria",
                            "equals": ["salud", "seguridad"],
                        },
                    },
                ],
            }
        ],
    }


def test_show_when_lista_no_exige_si_valor_fuera():
    validar_datos(_def_show_when_lista(), {"x": {"categoria": "empleo"}}, estricto=True)


def test_show_when_lista_exige_si_valor_dentro():
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(
            _def_show_when_lista(), {"x": {"categoria": "seguridad"}}, estricto=True
        )
    assert "x.detalle" in {e["path"] for e in exc.value.errores}


def _def_con_rango(required: bool = True):
    return {
        "version": 1,
        "steps": [
            {
                "id": "general",
                "type": "form",
                "title": "General",
                "fields": [
                    {
                        "name": "periodo",
                        "label": "Periodo",
                        "type": "date_range",
                        "required": required,
                    }
                ],
            }
        ],
    }


def test_date_range_valido_pasa():
    datos = {"general": {"periodo": {"start": "2026-01-01", "end": "2026-01-31"}}}
    validar_datos(_def_con_rango(), datos, estricto=True)


def test_date_range_mismo_dia_pasa():
    datos = {"general": {"periodo": {"start": "2026-01-01", "end": "2026-01-01"}}}
    validar_datos(_def_con_rango(), datos, estricto=True)


def test_date_range_invertido_falla():
    datos = {"general": {"periodo": {"start": "2026-02-01", "end": "2026-01-01"}}}
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(_def_con_rango(), datos, estricto=True)
    msgs = " ".join(e["msg"] for e in exc.value.errores)
    assert "inicial" in msgs


def test_date_range_incompleto_falla_incluso_en_borrador():
    datos = {"general": {"periodo": {"start": "2026-01-01", "end": ""}}}
    with pytest.raises(DatosInvalidosError):
        validar_datos(_def_con_rango(required=False), datos, estricto=False)


def test_date_range_no_objeto_falla():
    datos = {"general": {"periodo": "2026-01-01"}}
    with pytest.raises(DatosInvalidosError):
        validar_datos(_def_con_rango(), datos, estricto=True)


def test_date_range_vacio_required_falla_en_estricto():
    datos = {"general": {"periodo": {"start": "", "end": ""}}}
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(_def_con_rango(), datos, estricto=True)
    assert exc.value.errores[0]["msg"] == "requerido"


def test_date_range_vacio_pasa_en_borrador():
    datos = {"general": {"periodo": {"start": "", "end": ""}}}
    validar_datos(_def_con_rango(), datos, estricto=False)


def _def_con_rango_abierto(**extra):
    definicion = _def_con_rango()
    definicion["steps"][0]["fields"][0].update({"openEnd": True, **extra})
    return definicion


def test_date_range_fin_abierto_pasa():
    datos = {
        "general": {"periodo": {"start": "1992-02-10", "endOption": "NO DETERMINADO"}}
    }
    validar_datos(_def_con_rango_abierto(), datos, estricto=True)


def test_date_range_fin_abierto_no_compara_orden():
    datos = {
        "general": {"periodo": {"start": "2030-01-01", "endOption": "EN PROCESO"}}
    }
    validar_datos(_def_con_rango_abierto(), datos, estricto=True)


def test_date_range_opcion_sin_permiso_falla():
    datos = {
        "general": {"periodo": {"start": "1992-02-10", "endOption": "NO DETERMINADO"}}
    }
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(_def_con_rango(), datos, estricto=True)
    msgs = " ".join(e["msg"] for e in exc.value.errores)
    assert "no admite opciones" in msgs


def test_date_range_fecha_y_opcion_juntas_falla():
    datos = {
        "general": {
            "periodo": {
                "start": "1992-02-10",
                "end": "1995-01-01",
                "endOption": "NO DETERMINADO",
            }
        }
    }
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(_def_con_rango_abierto(), datos, estricto=True)
    msgs = " ".join(e["msg"] for e in exc.value.errores)
    assert "fecha y opcion" in msgs


def test_date_range_inicio_abierto_pasa():
    definicion = _def_con_rango()
    definicion["steps"][0]["fields"][0]["openStart"] = True
    datos = {
        "general": {"periodo": {"startOption": "NO DETERMINADO", "end": "2026-01-31"}}
    }
    validar_datos(definicion, datos, estricto=True)


def test_date_range_solo_opciones_no_es_vacio():
    datos = {"general": {"periodo": {"endOption": "NO DETERMINADO"}}}
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(_def_con_rango_abierto(), datos, estricto=True)
    msgs = " ".join(e["msg"] for e in exc.value.errores)
    assert "fecha inicial invalida" in msgs


def test_repeater_min_items_falla_en_estricto():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "items",
                "type": "repeater",
                "title": "Items",
                "minItems": 2,
                "fields": [{"name": "nombre", "label": "Nombre", "type": "text", "required": True}],
            }
        ],
    }
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(d, {"items": [{"nombre": "uno"}]}, estricto=True)
    msgs = " ".join(e["msg"] for e in exc.value.errores)
    assert "al menos" in msgs


def test_repeater_max_items_falla_siempre():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "items",
                "type": "repeater",
                "title": "Items",
                "maxItems": 1,
                "fields": [{"name": "nombre", "label": "Nombre", "type": "text"}],
            }
        ],
    }
    with pytest.raises(DatosInvalidosError):
        validar_datos(
            d,
            {"items": [{"nombre": "a"}, {"nombre": "b"}]},
            estricto=False,
        )


def test_select_multiple_lista():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "x",
                "type": "form",
                "title": "x",
                "fields": [
                    {
                        "name": "ejes",
                        "label": "Ejes",
                        "type": "select_multiple",
                        "options": [
                            {"value": "a", "label": "A"},
                            {"value": "b", "label": "B"},
                        ],
                    }
                ],
            }
        ],
    }
    validar_datos(d, {"x": {"ejes": ["a"]}}, estricto=True)
    with pytest.raises(DatosInvalidosError):
        validar_datos(d, {"x": {"ejes": ["a", "z"]}}, estricto=True)


def test_file_field_requiere_objeto_con_url():
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
                        "required": True,
                    }
                ],
            }
        ],
    }
    with pytest.raises(DatosInvalidosError):
        validar_datos(d, {"x": {"doc": "not-an-object"}}, estricto=True)
    validar_datos(
        d,
        {"x": {"doc": {"url_publica": "https://acervo/sieej-uploads/abc"}}},
        estricto=True,
    )


def test_repeater_con_show_when_dentro_del_item():
    d = {
        "version": 1,
        "steps": [
            {
                "id": "bd",
                "type": "repeater",
                "title": "BD",
                "minItems": 1,
                "fields": [
                    {
                        "name": "tiene_dicc",
                        "label": "Tiene?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Si"}, {"value": "false", "label": "No"}],
                        "required": True,
                    },
                    {
                        "name": "url",
                        "label": "URL",
                        "type": "text",
                        "required": True,
                        "showWhen": {"field": "tiene_dicc", "equals": "true"},
                    },
                ],
            }
        ],
    }
    # primer item dice "false" (no exige url), segundo dice "true" (sin url) → falla
    with pytest.raises(DatosInvalidosError) as exc:
        validar_datos(
            d,
            {"bd": [{"tiene_dicc": "false"}, {"tiene_dicc": "true"}]},
            estricto=True,
        )
    paths = {e["path"] for e in exc.value.errores}
    assert "bd[1].url" in paths
    assert "bd[0].url" not in paths
