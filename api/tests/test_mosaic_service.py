import pytest

from app.services.mosaic_service import (
    MosaicError,
    classify_files,
    list_mosaics,
    normalize_store_path,
    reindex_mosaic,
    resolve_index_name,
)

FOLDER = 'workspaces/raster/indices/nddi'

FILES = [
    'nddi_2025-01-01.tif',
    'nddi_2025-02-01.tif',
    'nddi.dbf',
    'nddi.fix',
    'nddi.prj',
    'nddi.properties',
    'nddi.qix',
    'nddi.shp',
    'nddi.shx',
    'sample_image.dat',
    'indexer.properties',
    'timeregex.properties',
    'notas.txt',
]


class FakeClient:
    def __init__(self, stores, files=None, properties=''):
        self._stores = stores
        self._files = files or []
        self._properties = properties
        self.deleted = []
        self.written = {}
        self.reset_calls = 0

    def list_workspaces(self):
        return sorted({ws for ws, _ in self._stores})

    def list_coveragestores(self, workspace):
        return [name for ws, name in self._stores if ws == workspace]

    def get_coveragestore(self, workspace, store):
        return self._stores[(workspace, store)] if isinstance(self._stores, dict) else {}

    def list_resource_files(self, path):
        return list(self._files)

    def get_resource(self, path):
        if path.endswith('.properties'):
            return self._properties.encode('utf-8')
        return b'contenido'

    def put_resource(self, path, content):
        self.written[path] = content

    def delete_resource(self, path):
        self.deleted.append(path)
        return True

    def reset(self):
        self.reset_calls += 1


class StoreMap(dict):
    def __init__(self, mapping):
        super().__init__(mapping)

    def __iter__(self):
        return iter(self.keys())


class TestNormalizeStorePath:
    def test_quita_el_prefijo_file(self):
        assert normalize_store_path('file:workspaces/raster/indices/nddi') == FOLDER

    def test_rechaza_rutas_absolutas(self):
        assert normalize_store_path('file:/opt/geoserver/data_dir/x') is None

    def test_vacio(self):
        assert normalize_store_path(None) is None


class TestResolveIndexName:
    def test_usa_typename_declarado(self):
        props = '#-Automagically created-\nTypeName=otro\nName=nddi\n'
        assert resolve_index_name(props, 'nddi') == 'otro'

    def test_cae_al_nombre_de_la_carpeta(self):
        assert resolve_index_name(None, 'nddi') == 'nddi'

    def test_ignora_comentarios_y_lineas_vacias(self):
        assert resolve_index_name('# nada\n\n', 'nddi') == 'nddi'


class TestClassifyFiles:
    def test_separa_indice_datos_y_protegidos(self):
        result = classify_files(FILES, 'nddi')
        assert 'sample_image.dat' in result.index
        assert 'nddi.properties' in result.index
        assert set(result.protected) == {'indexer.properties', 'timeregex.properties'}
        assert result.data == ['nddi_2025-01-01.tif', 'nddi_2025-02-01.tif']

    def test_lo_desconocido_no_se_toca(self):
        result = classify_files(FILES, 'nddi')
        assert result.unknown == ['notas.txt']
        assert 'notas.txt' not in result.index

    def test_no_toca_el_indice_de_otro_mosaico_en_la_misma_carpeta(self):
        result = classify_files(['nddi.dbf', 'otro.dbf'], 'nddi')
        assert result.index == ['nddi.dbf']
        assert result.unknown == ['otro.dbf']

    def test_respeta_un_nombre_de_indice_distinto_al_de_la_carpeta(self):
        result = classify_files(['idx.dbf', 'nddi.dbf'], 'idx')
        assert result.index == ['idx.dbf']


class TestListMosaics:
    def test_solo_devuelve_imagemosaic(self):
        stores = StoreMap({
            ('raster', 'nddi'): {'type': 'ImageMosaic', 'url': f'file:{FOLDER}'},
            ('raster', 'curvas'): {'type': 'GeoTIFF', 'url': 'file:workspaces/raster/curvas'},
        })
        client = FakeClient(stores)
        client._stores = stores
        client.list_coveragestores = lambda ws: [s for w, s in stores if w == ws]
        client.list_workspaces = lambda: ['raster']
        client.get_coveragestore = lambda ws, st: stores[(ws, st)]
        mosaicos = list_mosaics(client)
        assert [m['store'] for m in mosaicos] == ['nddi']
        assert mosaicos[0]['manageable'] is True

    def test_marca_como_no_administrable_la_carpeta_compartida(self):
        stores = StoreMap({
            ('raster', 'a'): {'type': 'ImageMosaic', 'url': f'file:{FOLDER}'},
            ('raster', 'b'): {'type': 'ImageMosaic', 'url': f'file:{FOLDER}'},
        })
        client = FakeClient(stores)
        client.list_workspaces = lambda: ['raster']
        client.list_coveragestores = lambda ws: ['a', 'b']
        client.get_coveragestore = lambda ws, st: stores[(ws, st)]
        mosaicos = list_mosaics(client)
        assert all(m['manageable'] is False for m in mosaicos)
        assert all(m['shared_folder'] for m in mosaicos)


class TestReindexGuards:
    def _client(self, files, store_type='ImageMosaic', url=f'file:{FOLDER}'):
        stores = {('raster', 'nddi'): {'type': store_type, 'url': url}}
        client = FakeClient(stores, files=files)
        client.list_workspaces = lambda: ['raster']
        client.list_coveragestores = lambda ws: ['nddi']
        client.get_coveragestore = lambda ws, st: stores[(ws, st)]
        return client

    def test_rechaza_lo_que_no_es_mosaico(self):
        client = self._client(FILES, store_type='GeoTIFF')
        with pytest.raises(MosaicError, match='no es un ImageMosaic'):
            reindex_mosaic(client, 'raster', 'nddi')

    def test_rechaza_ruta_absoluta(self):
        client = self._client(FILES, url='file:/opt/geoserver/data_dir/nddi')
        with pytest.raises(MosaicError, match='fuera del data dir'):
            reindex_mosaic(client, 'raster', 'nddi')

    def test_rechaza_carpeta_sin_rasters(self):
        client = self._client(['nddi.dbf', 'sample_image.dat'])
        with pytest.raises(MosaicError, match='sin datos'):
            reindex_mosaic(client, 'raster', 'nddi')

    def test_rechaza_carpeta_sin_indice(self):
        client = self._client(['nddi_2025-01-01.tif'])
        with pytest.raises(MosaicError, match='indice que reconstruir'):
            reindex_mosaic(client, 'raster', 'nddi')

    def test_no_borra_nada_cuando_rechaza(self):
        client = self._client(['nddi_2025-01-01.tif'])
        with pytest.raises(MosaicError):
            reindex_mosaic(client, 'raster', 'nddi')
        assert client.deleted == []
