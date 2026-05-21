export const NODE_TYPE_LABELS = {
    tema: 'Tema',
    category: 'Categoría',
    label: 'Etiqueta',
    group: 'Grupo',
    leaf: 'Capa',
    'evento-root': 'Eventos',
    'evento': 'Evento',
    'evento-categoria': 'Categoría (evento)',
    'evento-etiqueta': 'Etiqueta (evento)',
    'evento-capa': 'Capa (evento)',
};

export const PROPERTY_LABEL = 'Propiedad';

export const isPropertyOfGroup = (nodeType, parentNodeType) =>
    nodeType === 'leaf' && parentNodeType === 'group';

export const labelForNode = (nodeType, parentNodeType) => {
    if (isPropertyOfGroup(nodeType, parentNodeType)) return PROPERTY_LABEL;
    return NODE_TYPE_LABELS[nodeType] || nodeType;
};

export const NODE_TYPE_OPTIONS = [
    { value: 'tema', label: NODE_TYPE_LABELS.tema },
    { value: 'category', label: NODE_TYPE_LABELS.category },
    { value: 'label', label: NODE_TYPE_LABELS.label },
    { value: 'group', label: NODE_TYPE_LABELS.group },
    { value: 'leaf', label: NODE_TYPE_LABELS.leaf },
];


export const FIELD_VISIBILITY = {
    slug: ['group', 'leaf'],
    alias: ['group', 'leaf'],
    searchTags: ['group', 'leaf'],
};

export const TAB_VISIBILITY = {
    servicios: ['group', 'leaf'],
    infobox: ['group', 'leaf'],
    metadatos: ['group', 'leaf'],
    simbologia: ['group', 'leaf'],
    aviso: ['group', 'leaf'],
};

export const isFieldVisible = (field, nodeType) => {
    const list = FIELD_VISIBILITY[field];
    if (!list) return true;
    return !nodeType || list.includes(nodeType);
};

export const isTabVisible = (tab, nodeType) => {
    const list = TAB_VISIBILITY[tab];
    if (!list) return true;
    return !nodeType || list.includes(nodeType);
};

export const NODE_TYPE_HELP = {
    tema: {
        title: 'Tema',
        body: 'Agrupa categorías, etiquetas y capas en el árbol. No es activable por URL (no tiene slug/alias) ni expone WMS, infobox ni metadatos. Sus campos editables son organizativos: nombre y visibilidad.',
    },
    category: {
        title: 'Categoría',
        body: 'Subgrupo dentro de un tema. Solo organiza otros nodos; no es una capa real ni navegable por URL.',
    },
    label: {
        title: 'Etiqueta',
        body: 'Texto/separador puramente visual en el árbol. No es navegable por URL ni tiene servicios.',
    },
    group: {
        title: 'Grupo',
        body: 'Es una capa real cuyos hijos son propiedades (típicamente filtros CQL sobre el mismo feature type). Tiene slug/alias, WMS, infobox y metadatos como una capa.',
    },
    leaf: null,
};
