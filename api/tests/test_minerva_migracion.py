from app.services.minerva_migracion import planificar, roles_para


def _usuario(**extra):
    base = {
        "id": 1,
        "username": "maria.lopez",
        "email": "maria.lopez@iieg.gob.mx",
        "name": "Maria Lopez",
        "role": "editora",
        "projects": [],
        "minerva_vinculado": False,
    }
    base.update(extra)
    return base


def test_tetlamamakani_recibe_el_rol_compuesto():
    assert roles_para(_usuario(role="tetlamamakani")) == ["Administrador"]


def test_tetlamamakani_no_necesita_proyectos_asignados():
    assert roles_para(_usuario(role="tetlamamakani", projects=[])) == ["Administrador"]


def test_editora_traduce_cada_proyecto_a_su_rol_atomico():
    usuario = _usuario(
        projects=[
            {"slug": "mapalab", "project_role": "editor"},
            {"slug": "portal", "project_role": "viewer"},
        ]
    )
    assert roles_para(usuario) == ["MapaLab - edicion", "Portal - consulta"]


def test_editora_de_sieej_administra_formularios():
    usuario = _usuario(projects=[{"slug": "sieej", "project_role": "editor"}])
    assert roles_para(usuario) == ["SIEEJ - administracion"]


def test_los_proyectos_de_acervo_comparten_rol():
    usuario = _usuario(
        projects=[
            {"slug": "iieg", "project_role": "editor"},
            {"slug": "mariachi", "project_role": "editor"},
        ]
    )
    assert roles_para(usuario) == ["Acervo - carga"]


def test_proyecto_desconocido_no_inventa_rol():
    usuario = _usuario(projects=[{"slug": "frames", "project_role": "editor"}])
    assert roles_para(usuario) == []


def test_externo_con_sieej_solo_reporta():
    usuario = _usuario(role="externo", projects=[{"slug": "sieej", "project_role": "editor"}])
    assert roles_para(usuario) == ["SIEEJ - reportar"]


def test_externo_sin_sieej_no_recibe_nada():
    assert roles_para(_usuario(role="externo")) == []


def test_editora_sin_proyectos_no_recibe_nada():
    assert roles_para(_usuario()) == []


def test_planificar_separa_altas_de_existentes():
    padron = [
        _usuario(id=1, email="ya@iieg.gob.mx", projects=[{"slug": "portal", "project_role": "editor"}]),
        _usuario(id=2, email="falta@iieg.gob.mx", projects=[{"slug": "portal", "project_role": "editor"}]),
    ]
    plan = planificar(padron, {"YA@iieg.gob.mx"})

    assert [f["id"] for f in plan["existentes"]] == [1]
    assert [f["id"] for f in plan["crear"]] == [2]
    assert plan["total"] == 2


def test_planificar_aparta_a_quien_no_recibiria_ningun_rol():
    padron = [_usuario(id=3, email="huerfano@iieg.gob.mx", projects=[])]
    plan = planificar(padron, set())

    assert plan["crear"] == []
    assert plan["sin_roles"][0]["id"] == 3
    assert "negaria el codigo" in plan["sin_roles"][0]["motivo"]


def test_planificar_aparta_al_usuario_sin_correo():
    padron = [_usuario(id=4, email="", projects=[{"slug": "portal", "project_role": "editor"}])]
    plan = planificar(padron, set())

    assert plan["sin_roles"][0]["motivo"].startswith("sin correo")


def test_planificar_detecta_correos_repetidos_en_el_padron():
    padron = [
        _usuario(id=5, email="dos@iieg.gob.mx", projects=[{"slug": "portal", "project_role": "editor"}]),
        _usuario(id=6, email="DOS@iieg.gob.mx", projects=[{"slug": "portal", "project_role": "editor"}]),
    ]
    plan = planificar(padron, set())

    assert [f["id"] for f in plan["crear"]] == [5]
    assert [f["id"] for f in plan["duplicados"]] == [6]
