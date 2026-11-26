from unittest.mock import MagicMock

from app.services import estilos_resumen

SLD_INVALIDO = '<no'


def test_resumen_cruza_capas_y_tipo():
    estilos_resumen._cache.clear()
    client = MagicMock()
    client.list_workspace_styles.return_value = ['pob', 'suelto']
    client.list_layers.return_value = ['mun', 'loc']
    client.list_styles.side_effect = lambda ws, capa: {'mun': ['ws:pob'], 'loc': ['pob']}[capa]
    client.get_sld.return_value = SLD_INVALIDO
    resumen = estilos_resumen.resumen_estilos('ws', client)
    assert resumen['pob']['sharedBy'] == ['mun', 'loc']
    assert resumen['suelto']['sharedBy'] == []
    assert resumen['pob']['editable'] is False
    assert resumen['pob']['reason'].startswith('XML inválido')


def test_resumen_usa_la_cache():
    estilos_resumen._cache.clear()
    client = MagicMock()
    client.list_workspace_styles.return_value = []
    client.list_layers.return_value = []
    estilos_resumen.resumen_estilos('ws', client)
    estilos_resumen.resumen_estilos('ws', client)
    assert client.list_workspace_styles.call_count == 1
    estilos_resumen.resumen_estilos('ws', client, fresco=True)
    assert client.list_workspace_styles.call_count == 2
