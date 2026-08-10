import {
    MUNICIPIO_FIELD_TYPE_OPTIONS,
    NODE_TYPE_OPTIONS,
} from '@features/mapalab-layers/constants/nodeTypes';

export const IMAGE_FORMAT_OPTIONS = [
    { value: 'image/png', label: 'PNG' },
    { value: 'image/png8', label: 'PNG 8 bits (sin transparencia)' },
    { value: 'image/jpeg', label: 'JPEG (sin transparencia)' },
];

export const ANTIALIAS_OPTIONS = [
    { value: 'full', label: 'Completo' },
    { value: 'text', label: 'Solo texto' },
    { value: 'none', label: 'Ninguno' },
];

export const GEOMETRY_TYPE_OPTIONS = [
    { value: 'point', label: 'Punto' },
    { value: 'line', label: 'Línea' },
    { value: 'polygon', label: 'Polígono' },
    { value: 'raster', label: 'Ráster' },
];

export const LAYER_CONFIG_CATALOGS = {
    nodeType: NODE_TYPE_OPTIONS,
    imageFormat: IMAGE_FORMAT_OPTIONS,
    antialias: ANTIALIAS_OPTIONS,
    municipioFieldType: MUNICIPIO_FIELD_TYPE_OPTIONS,
    geometryType: GEOMETRY_TYPE_OPTIONS,
};
