export const NODE_TYPE_LABELS = {
    tema: 'Tema',
    category: 'Categoría',
    label: 'Etiqueta',
    group: 'Grupo',
    leaf: 'Capa',
};

export const NODE_TYPE_OPTIONS = [
    { value: 'tema', label: NODE_TYPE_LABELS.tema },
    { value: 'category', label: NODE_TYPE_LABELS.category },
    { value: 'label', label: NODE_TYPE_LABELS.label },
    { value: 'group', label: NODE_TYPE_LABELS.group },
    { value: 'leaf', label: NODE_TYPE_LABELS.leaf },
];

export const labelForNodeType = (nodeType) => NODE_TYPE_LABELS[nodeType] || nodeType;
