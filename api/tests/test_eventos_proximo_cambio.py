from datetime import timedelta

from app.api.routes.public import proximo_cambio_de_eventos
from app.core.time import utcnow
from app.models.evento import Evento


def _evento(db_session, slug, **campos):
    datos = {"estado": "published", "activo": True, **campos}
    evento = Evento(slug=slug, titulo=slug, **datos)
    db_session.add(evento)
    db_session.commit()
    return evento


def test_sin_fechas_no_hay_cambio_programado(db_session):
    _evento(db_session, "sin-fechas")
    assert proximo_cambio_de_eventos(db_session, utcnow()) is None


def test_manda_el_inicio_futuro_mas_cercano(db_session):
    ahora = utcnow()
    _evento(db_session, "lejano", fecha_inicio=ahora + timedelta(days=5))
    _evento(db_session, "cercano", fecha_inicio=ahora + timedelta(days=1))
    assert proximo_cambio_de_eventos(db_session, ahora) == ahora + timedelta(days=1)


def test_el_fin_de_un_evento_vigente_tambien_cuenta(db_session):
    ahora = utcnow()
    _evento(db_session, "vigente", fecha_inicio=ahora - timedelta(days=1), fecha_fin=ahora + timedelta(hours=6))
    _evento(db_session, "futuro", fecha_inicio=ahora + timedelta(days=2))
    assert proximo_cambio_de_eventos(db_session, ahora) == ahora + timedelta(hours=6)


def test_ignora_borradores_e_inactivos(db_session):
    ahora = utcnow()
    _evento(db_session, "inactivo", activo=False, fecha_inicio=ahora + timedelta(hours=1))
    borrador = _evento(db_session, "borrador", fecha_inicio=ahora + timedelta(hours=2))
    borrador.estado = "draft"
    db_session.commit()
    _evento(db_session, "publicado", fecha_inicio=ahora + timedelta(hours=3))
    assert proximo_cambio_de_eventos(db_session, ahora) == ahora + timedelta(hours=3)
