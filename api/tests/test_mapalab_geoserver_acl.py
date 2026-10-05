from app.models.layer import Layer, Workspace
from app.services import mapalab_geoserver_acl as acl
from tests.test_mapalab_acceso import de  # noqa: F401


class _Resp:
    def __init__(self, datos=None):
        self._datos = datos

    def raise_for_status(self):
        return None

    def json(self):
        return self._datos


class _Http:
    def __init__(self, reglas):
        self.reglas = dict(reglas)
        self.llamadas = []

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def get(self, url):
        return _Resp(dict(self.reglas))

    def post(self, url, json):
        self.llamadas.append(("post", json))
        self.reglas.update(json)
        return _Resp()

    def delete(self, url):
        regla = url.rsplit("/", 1)[1]
        self.llamadas.append(("delete", regla))
        self.reglas.pop(regla, None)
        return _Resp()


class _Cliente:
    def __init__(self, reglas):
        self.http = _Http(reglas)

    def _client(self):
        return self.http

    def _rest_url(self, path):
        return f"http://gs/rest/{path}"


def _sembrar(de):  # noqa: F811
    de.add(Workspace(alias="inst", geoserver_workspace="instituto", db_schema="instituto"))
    de.flush()
    de.add(Layer(id="interno", parent_id="tema", label="Interno", node_type="category", privada=True))
    de.add(Layer(id="espacios", parent_id="interno", label="Espacios", node_type="leaf", workspace_alias="inst", geoserver_layer="espacios"))
    de.add(Layer(id="compartida_priv", parent_id="interno", label="A", node_type="leaf", workspace_alias="inst", geoserver_layer="pisos"))
    de.add(Layer(id="compartida_pub", parent_id="tema", label="B", node_type="leaf", workspace_alias="inst", geoserver_layer="pisos"))
    de.commit()


def test_custodiadas_por_ancestro():
    filas = [("t", None, False), ("c", "t", True), ("h", "c", False), ("o", "t", False)]
    assert acl._custodiadas(filas) == {"c", "h"}


def test_solo_las_capas_que_no_tienen_nodo_publico(de):  # noqa: F811
    _sembrar(de)
    assert acl.reglas_deseadas(de) == {"instituto.espacios.r"}


def test_sincroniza_altas_bajas_y_respeta_las_ajenas(de):  # noqa: F811
    _sembrar(de)
    cliente = _Cliente({
        "*.*.r": "*",
        "vieja.capa.r": acl.ROL,
        "manual.capa.r": "ADMIN",
    })
    resultado = acl.sincronizar(de, cliente)
    assert resultado == {"agregadas": ["instituto.espacios.r"], "quitadas": ["vieja.capa.r"], "conflictos": []}
    assert cliente.http.reglas == {"*.*.r": "*", "manual.capa.r": "ADMIN", "instituto.espacios.r": acl.ROL}


def test_una_regla_manual_sobre_la_misma_capa_es_conflicto(de):  # noqa: F811
    _sembrar(de)
    cliente = _Cliente({"instituto.espacios.r": "ADMIN"})
    assert acl.sincronizar(de, cliente)["conflictos"] == ["instituto.espacios.r"]
    assert cliente.http.llamadas == []


def test_sin_cambios_no_llama(de):  # noqa: F811
    _sembrar(de)
    cliente = _Cliente({"instituto.espacios.r": acl.ROL})
    assert acl.sincronizar(de, cliente) == {"agregadas": [], "quitadas": [], "conflictos": []}
