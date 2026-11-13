from app.services.grids.layer_metadata_grid import FIELDS, _archivos


def test_normaliza_un_objeto_suelto_a_lista_y_descarta_vacios():
    assert _archivos({'nombre': 'Diccionario', 'enlace': '/metadata/xlsx/d.xlsx'}) == [
        {'nombre': 'Diccionario', 'enlace': '/metadata/xlsx/d.xlsx'},
    ]
    assert _archivos([{'nombre': '', 'enlace': ''}, 'basura']) is None
    assert _archivos([]) is None


def test_la_celda_lee_y_escribe_la_lista():
    campo = FIELDS['metadato']
    fila = {'metadato': [{'nombre': ' Ficha ', 'enlace': '/metadata/pdf/f.pdf', 'extra': 1}]}
    assert campo.read(fila) == [{'nombre': 'Ficha', 'enlace': '/metadata/pdf/f.pdf'}]
    campo.write(fila, None)
    assert fila['metadato'] == []
