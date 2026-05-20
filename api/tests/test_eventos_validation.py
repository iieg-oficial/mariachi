from app.models.project import Project
from tests.conftest import ADMIN_PREFIX


def _seed_mapalab(db_session):
    project = Project(slug="mapalab", name="MapaLab", is_active=True)
    db_session.add(project)
    db_session.commit()


def test_titulo_requerido(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_titulo_max_length_200(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "x" * 201},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_descripcion_max_length_2000(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T", "descripcion": "x" * 2001},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_capa_sin_workspace_rechazada(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T", "capas": [{"tipo": "capa", "layer": "lyr"}]},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_capa_sin_layer_rechazada(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T", "capas": [{"tipo": "capa", "workspace": "ws"}]},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_etiqueta_sin_alias_rechazada(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T", "capas": [{"tipo": "etiqueta", "alias": ""}]},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_capa_completa_aceptada(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={
            "titulo": "T",
            "capas": [{"tipo": "capa", "workspace": "ws", "layer": "lyr"}],
        },
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201


def test_categoria_sin_alias_rechazada(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T", "capas": [{"tipo": "categoria", "alias": ""}]},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_categoria_con_subcapas_aceptada(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={
            "titulo": "T",
            "capas": [
                {
                    "tipo": "categoria",
                    "alias": "Indicadores",
                    "capas": [
                        {"tipo": "etiqueta", "alias": "Demografia"},
                        {"tipo": "capa", "workspace": "ws", "layer": "lyr"},
                    ],
                },
            ],
        },
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201


def test_categoria_anidada_rechazada(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={
            "titulo": "T",
            "capas": [
                {
                    "tipo": "categoria",
                    "alias": "Outer",
                    "capas": [
                        {"tipo": "categoria", "alias": "Inner"},
                    ],
                },
            ],
        },
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_capa_con_subcapas_rechazada(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={
            "titulo": "T",
            "capas": [
                {
                    "tipo": "capa",
                    "workspace": "ws",
                    "layer": "lyr",
                    "capas": [{"tipo": "etiqueta", "alias": "x"}],
                },
            ],
        },
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_bbox_fuera_de_rango_rechazado(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={
            "titulo": "T",
            "bbox": {"minx": 999, "miny": 0, "maxx": 1000, "maxy": 1},
        },
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_bbox_invertido_rechazado(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={
            "titulo": "T",
            "bbox": {"minx": 10, "miny": 10, "maxx": 0, "maxy": 0},
        },
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_bbox_jalisco_aceptado(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={
            "titulo": "T",
            "bbox": {"minx": -105.7, "miny": 18.9, "maxx": -101.5, "maxy": 22.7},
        },
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201


def test_icono_url_javascript_rechazado(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T", "iconoUrl": "javascript:alert(1)"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_icono_url_https_aceptado(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T", "iconoUrl": "https://example.com/icon.png"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201


def test_imagen_url_acervo_bucket_conocido_aceptada(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T", "imagenUrl": "mapalab/eventos/portada.jpg"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201


def test_imagen_url_acervo_bucket_desconocido_rechazada(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T", "imagenUrl": "etc/passwd"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_imagen_url_path_traversal_rechazado(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T", "imagenUrl": "mapalab/../etc/passwd"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 422


def test_slug_autogenerado_del_titulo(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "Mundial 2026"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201
    assert response.json()["slug"] == "mundial-2026"


def test_slug_colision_se_resuelve_con_sufijo(admin_session, db_session):
    _seed_mapalab(db_session)
    headers = {"X-CSRF-Token": admin_session["csrf"]}
    r1 = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos", json={"titulo": "Demo"}, headers=headers,
    )
    r2 = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos", json={"titulo": "Demo"}, headers=headers,
    )
    assert r1.json()["slug"] == "demo"
    assert r2.json()["slug"] == "demo-2"


def test_slug_explicito_respetado(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "X", "slug": "mi-evento"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.json()["slug"] == "mi-evento"
