from app.services.acervo_file_service import carpetas_de_objetos


def test_deriva_cada_nivel_de_las_rutas_de_los_objetos():
    nombres = ['metadata/txt/a.txt', 'metadata/xlsx/b.xlsx', 'raiz.pdf', 'vacia/.keep']
    assert carpetas_de_objetos(nombres, []) == {'metadata/', 'metadata/txt/', 'metadata/xlsx/', 'vacia/'}


def test_respeta_los_prefijos_ocultos():
    nombres = ['_thumbs/a.webp', 'docs/c.pdf']
    assert carpetas_de_objetos(nombres, ['_thumbs/']) == {'docs/'}
