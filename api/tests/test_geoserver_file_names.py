import pytest
from fastapi import HTTPException

from app.api.routes.geoserver import (
    _build_file_response,
    _is_store_config,
    _validate_file_name,
    _validate_file_name_readonly,
    _validate_move_target,
)


class TestValidateFileNameReadonly:
    def test_acepta_nombres_legados_con_espacios_y_acentos(self):
        _validate_file_name_readonly('Icono Salud.svg')
        _validate_file_name_readonly('cafe con leche.png')
        _validate_file_name_readonly('estación (norte).svg')

    def test_los_mismos_nombres_los_rechaza_la_validacion_estricta(self):
        with pytest.raises(HTTPException):
            _validate_file_name('Icono Salud.svg')

    def test_rechaza_vacio(self):
        with pytest.raises(HTTPException) as exc:
            _validate_file_name_readonly('')
        assert exc.value.status_code == 400

    @pytest.mark.parametrize('name', [
        '../secreto.svg',
        'styles/../../secreto.svg',
        '/absoluto.svg',
        'carpeta/',
        '..\\windows.svg',
    ])
    def test_rechaza_path_traversal(self, name):
        with pytest.raises(HTTPException) as exc:
            _validate_file_name_readonly(name)
        assert 'traversal' in exc.value.detail

    @pytest.mark.parametrize('name', [
        'datastore.xml',
        'demografia/datastore.xml',
        'workspace.xml',
        'namespace.xml',
        'styles/poblacion.sld',
    ])
    def test_rechaza_recursos_de_configuracion_de_geoserver(self, name):
        """La raiz del workspace en el Resource API tambien contiene los XML de
        configuracion (datastore.xml lleva las credenciales de la BD). El endpoint
        de archivos es solo para iconos, fuentes y properties de mosaico."""
        with pytest.raises(HTTPException) as exc:
            _validate_file_name_readonly(name)
        assert exc.value.status_code == 400
        assert 'no permitida' in exc.value.detail

    @pytest.mark.parametrize('name', [
        'icono.svg', 'foto.png', 'mapa.jpeg', 'fuente.ttf', 'fuente.otf',
        'subcarpeta/icono.svg',
    ])
    def test_acepta_imagenes_y_fuentes(self, name):
        _validate_file_name_readonly(name)

    @pytest.mark.parametrize('name', [
        'indexer.properties',
        'timeregex.properties',
        'lluvia/indexer.properties',
    ])
    def test_acepta_los_properties_del_imagemosaic(self, name):
        _validate_file_name_readonly(name)
        _validate_file_name(name)

    @pytest.mark.parametrize('name', [
        'datastore.properties',
        'lluvia/datastore.properties',
        'coveragestore.properties',
        'DataStore.Properties',
    ])
    def test_rechaza_el_properties_del_almacen_que_lleva_la_contrasena(self, name):
        """Un ImageMosaic con indice en PostGIS deja su datastore.properties junto a
        los rasters, con la contrasena en claro. Aceptar la extension .properties no
        puede abrir ese archivo."""
        for validar in (_validate_file_name_readonly, _validate_file_name):
            with pytest.raises(HTTPException) as exc:
                validar(name)
            assert exc.value.status_code == 403
            assert 'credenciales' in exc.value.detail

    def test_extension_es_case_insensitive(self):
        _validate_file_name_readonly('ICONO.SVG')


class TestIsStoreConfig:
    @pytest.mark.parametrize('name', [
        'datastore.xml',
        'demografia/datastore.xml',
        'coveragestore.xml',
        'raster/coveragestore.xml',
        'wmsstore.xml',
        'wmtsstore.xml',
        'DataStore.XML',
        'datastore.properties',
        'lluvia_mensual/datastore.properties',
        'coveragestore.properties',
        'DataStore.Properties',
    ])
    def test_detecta_archivos_de_conexion(self, name):
        assert _is_store_config(name) is True

    @pytest.mark.parametrize('name', [
        'indexer.properties',
        'timeregex.properties',
        'lluvia_mensual/indexer.properties',
    ])
    def test_no_confunde_los_properties_del_mosaico(self, name):
        assert _is_store_config(name) is False

    @pytest.mark.parametrize('name', [
        'styles/poblacion.sld',
        'styles/poblacion.xml',
        'workspace.xml',
        'namespace.xml',
        'icono.svg',
        'layergroups/demografia.xml',
        'mi_store.svg',
    ])
    def test_no_marca_estilos_ni_metadatos(self, name):
        assert _is_store_config(name) is False


class TestBuildFileResponse:
    def test_url_encodea_el_nombre(self):
        res = _build_file_response('Icono Salud.svg', 'image/svg+xml')
        assert 'Icono%20Salud.svg' in res.download_url
        assert ' ' not in res.download_url

    def test_url_encodea_el_workspace(self):
        res = _build_file_response('icono.svg', None, workspace='mi ws')
        assert 'workspace=mi%20ws' in res.download_url

    def test_conserva_las_barras_de_subcarpeta(self):
        res = _build_file_response('sub/icono.svg', None)
        assert 'sub/icono.svg' in res.download_url

    def test_el_nombre_crudo_se_conserva_en_el_campo_name(self):
        res = _build_file_response('Icono Salud.svg', None)
        assert res.name == 'Icono Salud.svg'

    def test_escapa_xml_en_el_snippet_sld(self):
        res = _build_file_response('a&b.svg', None)
        assert '&amp;' in res.sld_snippet
        assert 'a&b.svg' not in res.sld_snippet

    def test_escapa_comillas_en_el_atributo_href(self):
        res = _build_file_response('raro".svg', None)
        assert '&quot;' in res.sld_snippet
        assert res.sld_snippet.count('xlink:href="') == 1


class TestValidateMoveTarget:
    def test_renombra_un_archivo_conservando_la_extension(self):
        assert _validate_move_target('iconos/viejo.svg', 'iconos/nuevo.svg', False) == 'iconos/nuevo.svg'

    def test_rechaza_cambiar_la_extension(self):
        with pytest.raises(HTTPException) as exc:
            _validate_move_target('iconos/logo.svg', 'iconos/logo.png', False)
        assert 'extension' in exc.value.detail

    def test_rechaza_un_destino_con_extension_no_permitida(self):
        with pytest.raises(HTTPException):
            _validate_move_target('iconos/logo.svg', 'iconos/datastore.xml', False)

    def test_acepta_origen_legado_con_espacios(self):
        assert _validate_move_target('Icono Salud.svg', 'icono_salud.svg', False) == 'icono_salud.svg'

    def test_rechaza_destino_con_espacios(self):
        with pytest.raises(HTTPException):
            _validate_move_target('logo.svg', 'nuevo logo.svg', False)

    def test_mueve_una_carpeta(self):
        assert _validate_move_target('a/b', 'c/b', True) == 'c/b'

    def test_rechaza_mover_una_carpeta_dentro_de_si_misma(self):
        with pytest.raises(HTTPException) as exc:
            _validate_move_target('iconos', 'iconos/sub', True)
        assert 'dentro de si misma' in exc.value.detail

    def test_rechaza_carpeta_destino_igual_al_origen(self):
        with pytest.raises(HTTPException):
            _validate_move_target('iconos', 'iconos', True)

    @pytest.mark.parametrize('destino', ['../fuera', 'a/../../fuera'])
    def test_rechaza_path_traversal_en_el_destino(self, destino):
        with pytest.raises(HTTPException):
            _validate_move_target('iconos', destino, True)

    def test_tolera_la_barra_inicial_igual_que_browse_y_zip(self):
        assert _validate_move_target('iconos', '/destino', True) == 'destino'

