export const ZOOM_MIN = 0;
export const ZOOM_MAX = 20;

export const ZOOM_MARKS = {
    0: 'Estado',
    6: 'Municipio',
    10: 'Ciudad',
    14: 'Colonia',
    18: 'Calle',
};

const SCALE_STEPS = [
    { z: 0, label: 'Estado' },
    { z: 6, label: 'Municipio' },
    { z: 10, label: 'Ciudad' },
    { z: 14, label: 'Colonia' },
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
