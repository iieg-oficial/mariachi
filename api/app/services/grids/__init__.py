from app.services.grid_batch import GridSpec
from app.services.grids.layer_config_grid import SPEC as LAYER_CONFIG_SPEC
from app.services.grids.layer_metadata_grid import SPEC as LAYER_METADATA_SPEC
from app.services.grids.wacha_camaras_grid import SPEC as WACHA_CAMARAS_SPEC

SPECS: dict[str, GridSpec] = {
    LAYER_METADATA_SPEC.key: LAYER_METADATA_SPEC,
    LAYER_CONFIG_SPEC.key: LAYER_CONFIG_SPEC,
    WACHA_CAMARAS_SPEC.key: WACHA_CAMARAS_SPEC,
}


def get_spec(key: str) -> GridSpec | None:
    return SPECS.get(key)


__all__ = ['SPECS', 'get_spec']
