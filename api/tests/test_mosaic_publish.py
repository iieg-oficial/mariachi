import pytest

from app.services.geoserver_client import GeoServerError
from app.services.mosaic_publish import (
    enable_time,
    extract_date,
    harvest_new,
    is_time_enabled,
    mosaic_status,
    parse_timeregex,
    publish_mosaic,
    suggest_format,
    timeregex_properties,
    validate_folder,
)
from app.services.mosaic_service import MosaicError

FOLDER = 'geoserver-raster/lluvia/mensual'
DATA_DIR = '/opt/geoserver/data_dir'
COVERAGE_XML = (
    '<coverage><name>mensual</name><metadata>'
    '<entry key="dirName">mensual_x</entry>'
    '</metadata></coverage>'
)


class FakeClient:
    def __init__(self, files, stores=None, fail_create=False):
        self.files = list(files)
        self.stores = dict(stores or {})
        self.fail_create = fail_create
        self.written = {}
        self.deleted = []
        self.harvested = []
        self.coverage_xml = COVERAGE_XML
        self.granules = []
        self.store_url = None

    def list_workspaces(self):
        return ['raster']

    def list_coveragestores(self, workspace):
        return [s for w, s in self.stores if w == workspace]

    def get_coveragestore(self, workspace, store):
        return self.stores[(workspace, store)]

    def coveragestore_exists(self, workspace, store):
        return (workspace, store) in self.stores

    def layer_exists(self, workspace, store):
        return False

    def list_resource_files(self, path):
        return list(self.files)

    def get_resource(self, path):
        if path.endswith('timeregex.properties'):
            return timeregex_properties('yyyy_MM').encode()
        raise GeoServerError('no existe')

    def put_resource(self, path, content):
        self.written[path] = content.decode()
        name = path.rsplit('/', 1)[-1]
        if name not in self.files:
            self.files.append(name)

    def delete_resource(self, path):
        self.deleted.append(path)
        name = path.rsplit('/', 1)[-1]
        if name in self.files:
            self.files.remove(name)
        return True

    def create_external_mosaic(self, workspace, store, absolute_path):
        if self.fail_create:
            self.stores[(workspace, store)] = {'type': 'ImageMosaic', 'url': f'file:{absolute_path}'}
            self.files += [f'{store}.dbf', f'{store}.shp']
            raise GeoServerError('reader')
        self.created = absolute_path
        self.stores[(workspace, store)] = {'type': 'ImageMosaic', 'url': f'file:{absolute_path}'}
        self.granules = [
            {'location': n, 'ingestion': '2025-01-01T00:00:00.000Z'} for n in self.files if n.endswith('.tif')
        ]

    def set_coveragestore_url(self, workspace, store, url):
        self.stores[(workspace, store)]['url'] = url

    def delete_coveragestore(self, workspace, store):
        self.stores.pop((workspace, store), None)

    def list_coverages(self, workspace, store):
        return [store] if (workspace, store) in self.stores else []

    def get_coverage_xml(self, workspace, store, coverage):
        return self.coverage_xml

    def put_coverage_xml(self, workspace, store, coverage, xml):
        self.coverage_xml = xml

    def list_granules(self, workspace, store, coverage):
        return list(self.granules)

    def advertises_time(self, workspace, layer):
        return is_time_enabled(self.coverage_xml)

    def harvest_granule(self, workspace, store, absolute_path):
        self.harvested.append(absolute_path)


TIFS = ['lluvia_2025_01.tif', 'lluvia_2025_02.tif']


class TestFechas:
    def test_lee_la_fecha_del_nombre_sin_extension(self):
        assert extract_date('lluvia_2025-06-01.tif', 'yyyy-MM-dd') == '2025-06-01'
        assert extract_date('lluvia_total_mensual_2025_06.tif', 'yyyy_MM') == '2025-06-01'

    def test_ancla_al_final_aunque_el_prefijo_traiga_digitos(self):
        assert extract_date('capa2_v3_202506.tif', 'yyyyMM') == '2025-06-01'

    def test_rechaza_fechas_imposibles(self):
        assert extract_date('capa_202513.tif', 'yyyyMM') is None

    def test_sugiere_el_formato_que_casa_con_todos(self):
        assert suggest_format(TIFS) == 'yyyy_MM'
        assert suggest_format(['a_2025-01-01.tif']) == 'yyyy-MM-dd'
        assert suggest_format(['sin_fecha.tif']) is None

    def test_el_formato_va_en_la_misma_linea_que_el_regex(self):
        content = timeregex_properties('yyyy_MM')
        assert content == 'regex=.*([0-9]{4}_[0-9]{2})$,format=yyyy_MM\n'
        assert parse_timeregex(content) == 'yyyy_MM'
        assert parse_timeregex('regex=.*([0-9]{8}).*\n') is None


class TestValidarCarpeta:
    def test_acepta_raster_y_workspace(self):
        assert validate_folder(FOLDER) == (FOLDER, 'mensual')
        assert validate_folder('workspaces/raster/indices/nddi/')[1] == 'nddi'

    @pytest.mark.parametrize('path', ['styles/x', '../x', 'geoserver-raster', 'geoserver-raster/a b'])
    def test_rechaza_rutas_fuera_o_invalidas(self, path):
        with pytest.raises(MosaicError):
            validate_folder(path)


class TestPublicar:
    def test_publica_con_ruta_relativa_y_time(self):
        client = FakeClient(TIFS)
        result = publish_mosaic(client, 'raster', FOLDER, 'yyyy_MM', DATA_DIR)
        assert client.created == f'{DATA_DIR}/{FOLDER}'
        assert client.stores[('raster', 'mensual')]['url'] == f'file:{FOLDER}'
        assert 'format=yyyy_MM' in client.written[f'{FOLDER}/timeregex.properties']
        assert is_time_enabled(client.coverage_xml)
        assert 'dirName' in client.coverage_xml
        assert result['advertised'] is True
        assert result['rasters'] == 2

    def test_rechaza_archivos_sin_fecha_sin_tocar_nada(self):
        client = FakeClient(TIFS + ['lluvia_final.tif'])
        with pytest.raises(MosaicError, match='lluvia_final.tif'):
            publish_mosaic(client, 'raster', FOLDER, 'yyyy_MM', DATA_DIR)
        assert client.written == {}

    def test_rechaza_un_store_existente(self):
        client = FakeClient(TIFS, stores={('raster', 'mensual'): {'type': 'ImageMosaic', 'url': 'file:x/y'}})
        with pytest.raises(MosaicError, match='Ya existe'):
            publish_mosaic(client, 'raster', FOLDER, 'yyyy_MM', DATA_DIR)

    def test_borra_un_indice_huerfano_antes_de_publicar(self):
        client = FakeClient(TIFS + ['mensual.dbf', 'sample_image.dat'])
        result = publish_mosaic(client, 'raster', FOLDER, 'yyyy_MM', DATA_DIR)
        assert set(result['stale_index_removed']) == {'mensual.dbf', 'sample_image.dat'}

    def test_deshace_si_geoserver_falla(self):
        client = FakeClient(TIFS, fail_create=True)
        with pytest.raises(MosaicError, match='se deshizo'):
            publish_mosaic(client, 'raster', FOLDER, 'yyyy_MM', DATA_DIR)
        assert ('raster', 'mensual') not in client.stores
        assert 'mensual.dbf' not in client.files
        assert 'indexer.properties' in client.files


class TestTiempoYCosecha:
    def _published(self, files):
        client = FakeClient(files, stores={('raster', 'mensual'): {'type': 'ImageMosaic', 'url': f'file:{FOLDER}'}})
        client.granules = [{'location': TIFS[0], 'ingestion': '2025-01-01T00:00:00.000Z'}]
        return client

    def test_activar_reemplaza_la_entrada_y_conserva_el_resto(self):
        client = self._published(TIFS)
        client.coverage_xml = COVERAGE_XML.replace(
            '</metadata>',
            '<entry key="time"><dimensionInfo><enabled>false</enabled></dimensionInfo></entry></metadata>',
        )
        enable_time(client, 'raster', 'mensual')
        assert client.coverage_xml.count('key="time"') == 1
        assert is_time_enabled(client.coverage_xml)
        assert 'dirName' in client.coverage_xml

    def test_estado_separa_pendientes_y_faltantes(self):
        client = self._published([TIFS[1]])
        status = mosaic_status(client, 'raster', 'mensual')
        assert status['pending'] == [TIFS[1]]
        assert status['missing'] == [TIFS[0]]
        assert status['time_enabled'] is False

    def test_cosecha_solo_lo_nuevo(self):
        client = self._published(TIFS)
        result = harvest_new(client, 'raster', 'mensual', DATA_DIR)
        assert result['harvested'] == [TIFS[1]]
        assert client.harvested == [f'{DATA_DIR}/{FOLDER}/{TIFS[1]}']

    def test_cosecha_rechaza_nombres_sin_fecha(self):
        client = self._published([TIFS[0], 'lluvia_final.tif'])
        with pytest.raises(MosaicError, match='sin fecha'):
            harvest_new(client, 'raster', 'mensual', DATA_DIR)
        assert client.harvested == []

    def test_cosecha_sin_pendientes(self):
        client = self._published([TIFS[0]])
        with pytest.raises(MosaicError, match='No hay archivos nuevos'):
            harvest_new(client, 'raster', 'mensual', DATA_DIR)
