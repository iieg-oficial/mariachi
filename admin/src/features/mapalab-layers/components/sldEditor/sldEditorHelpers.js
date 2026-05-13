export const SHAPE_OPTIONS = [
    { label: 'Coroplético', value: 'choropleth' },
    { label: 'Boundary', value: 'boundary' },
    { label: 'Punto', value: 'point' },
];

export function emptyModelForShape(shape, layerName, styleTitle) {
    const base = { layer_name: layerName || '', style_title: styleTitle || '' };
    if (shape === 'boundary') {
        return { ...base, polygon: null, label: null };
    }
    if (shape === 'point') {
        return {
            ...base,
            point: { symbol_id: null, size: 16, rotation: 0, opacity: 1.0 },
            label: null,
        };
    }
    return {
        ...base,
        attribute: '',
        cortes: [0, 100],
        labels: ['Sin definir'],
        colors: ['#cccccc'],
        stroke: { color: '#7A7A7A', width: 0.35, opacity: 1, linejoin: 'bevel' },
        null_style: null,
    };
}

export function stripPrefix(s) {
    return s && s.includes(':') ? s.split(':').slice(1).join(':') : s;
}
