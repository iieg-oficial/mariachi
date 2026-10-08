export const MUNICIPIO_STYLE = { color: '#FF8300', bg: '#FFF2E5' };
export const CARACTERISTICA_STYLE = { color: '#7B61FF', bg: '#F3F0FF' };

export const STYLE_PRESETS = [
    { key: 'municipio', label: 'Municipio (naranja)', ...MUNICIPIO_STYLE },
    { key: 'caracteristica', label: 'Característica (morado)', ...CARACTERISTICA_STYLE },
    { key: 'institucion', label: 'Institución (azul)', color: '#2E4372', bg: '#F0F0F0' },
    { key: 'estatus_ok', label: 'Estatus OK (verde)', color: '#0FC136', bg: '#DDFFE4' },
    { key: 'submorado', label: 'Sub-morado (claro)', color: '#5C2472', bg: '#F0EAF3' },
];
