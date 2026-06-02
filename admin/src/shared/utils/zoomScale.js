// Alineado al rango real del visor MapaLab: minZoom 8 (desktop) / maxZoom 18.
export const ZOOM_MIN = 8;
export const ZOOM_MAX = 18;

export const ZOOM_MARKS = {
    8: 'Estado',
    11: 'Municipio',
    13: 'Ciudad',
    16: 'Colonia',
    18: 'Calle',
};

const SCALE_STEPS = [
    { z: 8, label: 'Estado' },
    { z: 11, label: 'Municipio' },
    { z: 13, label: 'Ciudad' },
    { z: 16, label: 'Colonia' },
    { z: 18, label: 'Calle' },
];

export const zoomLevelLabel = (zoom) => {
    if (typeof zoom !== 'number') return '';
    let label = SCALE_STEPS[0].label;
    SCALE_STEPS.forEach((step) => { if (zoom >= step.z) label = step.label; });
    return label;
};

export const clampZoom = (value, fallback) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
};
