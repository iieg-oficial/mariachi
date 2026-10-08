from app.services.mel_qss import render_tokens_qss


class TokenFalso:
    def __init__(self, clave, valor):
        self.clave = clave
        self.valor = valor


def token(clave, valor):
    return TokenFalso(clave, valor)


def test_convierte_rem_a_px_porque_qss_no_entiende_rem():
    qss = render_tokens_qss(
        [token("color.primary", "#5C2472"), token("radius.sm", "0.25rem"),
         token("space.2", "0.5rem"), token("space.3", "0.75rem")],
        [],
    )
    assert "border-radius: 4px" in qss
    assert "padding: 8px 12px" in qss
    assert "rem" not in qss


def test_emite_la_lista_completa_de_familias_para_tener_respaldo():
    qss = render_tokens_qss(
        [token("font.family.sans", ["Garet", "system-ui", "sans-serif"])], []
    )
    assert 'font-family: "Garet", "system-ui", "sans-serif";' in qss


def test_sin_tokens_de_color_no_inventa_ninguno():
    qss = render_tokens_qss([token("radius.sm", "0.25rem")], [])
    assert "#" not in qss.split("*/")[-1]


def test_el_acento_solo_se_usa_como_fondo_nunca_como_texto():
    qss = render_tokens_qss(
        [token("color.accent", "#FF8300"), token("color.text", "#465055")], []
    )
    declaraciones = [linea.strip() for linea in qss.splitlines()]
    assert "background-color: #FF8300;" in declaraciones
    assert "color: #FF8300;" not in declaraciones


def test_deja_al_tema_del_anfitrion_lo_que_no_es_marca():
    qss = render_tokens_qss([token("color.primary", "#5C2472")], [])
    assert "palette(mid)" in qss


def test_lista_las_fuentes_para_que_el_cliente_las_registre():
    class FuenteFalsa:
        familia = "Garet"
        formato = "opentype"
        base_url = "https://ejemplo/tipografia/"
        faces = [{"file": "garet-book.otf", "weight": 400}]

    qss = render_tokens_qss([], [FuenteFalsa()])
    assert "https://ejemplo/tipografia/garet-book.otf" in qss
