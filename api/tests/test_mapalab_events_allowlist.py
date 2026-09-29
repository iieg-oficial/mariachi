import pytest
from pydantic import ValidationError

from app.schemas.mapalab_event import EventBatchIn, EventIn

HERRAMIENTAS_NUEVAS = [
    "view3d",
    "north_reset",
    "tabla_open",
    "tabla_filter",
    "tabla_download",
    "stats_open",
    "stats_custom_create",
    "stats_detach",
    "colibri_open",
]


@pytest.mark.parametrize("nombre", HERRAMIENTAS_NUEVAS)
def test_acepta_eventos_de_herramientas_nuevas(nombre: str) -> None:
    assert EventIn.model_validate({"eventName": nombre}).event_name == nombre


def test_un_evento_desconocido_se_ubica_por_indice() -> None:
    with pytest.raises(ValidationError) as exc:
        EventBatchIn.model_validate({
            "sessionId": "8d5c1c7e-3f4a-4b7e-9a51-1f0f7b9b2c11",
            "events": [{"eventName": "layer_toggle"}, {"eventName": "no_existe"}],
        })
    locs = [error["loc"][:2] for error in exc.value.errors()]
    assert locs == [("events", 1)]
