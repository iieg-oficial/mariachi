"""Tests de los validators de la configuracion de columnas de la tabla del visor.

Cubren lo que entra por `PUT /layer-metadata/{layer_key}/columnas`: el formato
tiene que ser uno de los cinco que acepta el CHECK de la tabla, el alias vacio
se guarda como NULL para que el visor caiga al nombre crudo, y una carga con
columnas repetidas se rechaza antes de tocar la base.
"""
import pytest
from pydantic import ValidationError

from app.schemas.columna_tabla import ColumnasTablaUpdate, ColumnaTablaItem


class TestColumnaTablaItem:
    def test_formato_valido_pasa(self):
        item = ColumnaTablaItem(columna='p_total', formato='entero')
        assert item.formato == 'entero'

    def test_formato_invalido_se_rechaza(self):
        with pytest.raises(ValidationError):
            ColumnaTablaItem(columna='p_total', formato='porcentaje')

    def test_formato_vacio_queda_en_none(self):
        assert ColumnaTablaItem(columna='p_total', formato='').formato is None
        assert ColumnaTablaItem(columna='p_total').formato is None

    def test_alias_en_blanco_queda_en_none(self):
        assert ColumnaTablaItem(columna='cve_mun', alias='   ').alias is None
        assert ColumnaTablaItem(columna='cve_mun', alias=' Municipio ').alias == 'Municipio'

    def test_valores_por_defecto(self):
        item = ColumnaTablaItem(columna='cve_mun')
        assert item.orden == 0
        assert item.visible is True

    def test_orden_fuera_de_rango_se_rechaza(self):
        with pytest.raises(ValidationError):
            ColumnaTablaItem(columna='cve_mun', orden=-1)


class TestColumnasTablaUpdate:
    def test_columnas_repetidas_se_rechazan(self):
        with pytest.raises(ValidationError):
            ColumnasTablaUpdate(columnas=[
                {'columna': 'cve_mun'},
                {'columna': 'cve_mun', 'alias': 'Otro'},
            ])

    def test_lista_vacia_es_valida(self):
        assert ColumnasTablaUpdate(columnas=[]).columnas == []

    def test_conserva_el_orden_recibido(self):
        carga = ColumnasTablaUpdate(columnas=[
            {'columna': 'p_total', 'orden': 0},
            {'columna': 'cve_mun', 'orden': 1},
        ])
        assert [item.columna for item in carga.columnas] == ['p_total', 'cve_mun']
