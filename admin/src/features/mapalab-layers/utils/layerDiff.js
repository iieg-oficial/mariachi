export const FIELD_LABELS = {
    label: 'Nombre',
    slug: 'Nombre en URL',
    nodeType: 'Tipo de nodo',
    parentId: 'Padre',
    hiddenInMenu: 'Oculta en menú',
    disabled: 'Fuera de servicio',
    searchTags: 'Etiquetas de búsqueda',
    hasMunicipio: 'Filtro por municipio',
    municipioField: 'Campo de municipio',
    municipioFieldType: 'Tipo de campo de municipio',
    workspaceAlias: 'Workspace',
    geoserverLayer: 'Capa de GeoServer',
    styles: 'Estilos',
    cqlFilter: 'Filtro CQL',
    wmsGroup: 'Grupo WMS',
    tiled: 'Teselado',
    imageFormat: 'Formato de imagen',
    antialias: 'Suavizado',
    wfsAvailable: 'Descarga WFS',
    downloadable: 'Descargable',
    geometryType: 'Tipo de geometría',
    timeEnabled: 'Soporte temporal',
    defaultDate: 'Fecha por defecto',
    timeStylePattern: 'Patrón de estilo temporal',
    hidePeriodicity: 'Ocultar periodicidad',
    defaultZoom: 'Zoom por defecto',
    zoomRange: 'Rango de zoom',
    infoboxConfig: 'Tarjeta',
    notice: 'Aviso',
    badge: 'Estatus de capa',
    highlightColor: 'Color de resaltado',
    highlightShape: 'Forma de resaltado',
    iconUrl: 'Ícono',
    iconOverrides: 'Iconos por estado',
};

export const FIELD_SECTIONS = {
    label: 'Identidad',
    slug: 'Identidad',
    nodeType: 'Identidad',
    parentId: 'Identidad',
    searchTags: 'Identidad',
    hasMunicipio: 'Identidad',
    municipioField: 'Identidad',
    municipioFieldType: 'Identidad',
    hiddenInMenu: 'Apariencia',
    disabled: 'Apariencia',
    notice: 'Apariencia',
    badge: 'Apariencia',
    highlightColor: 'Apariencia',
    highlightShape: 'Apariencia',
    iconUrl: 'Apariencia',
    iconOverrides: 'Apariencia',
    infoboxConfig: 'Tarjetita',
};

export const sectionOf = (field) => FIELD_SECTIONS[field] || 'Servicios';

export const labelOf = (field) => FIELD_LABELS[field] || field;

const norm = (v) => {
    if (v === undefined || v === '') return null;
    if (Array.isArray(v)) return JSON.stringify(v);
    if (v && typeof v === 'object') return JSON.stringify(v);
    return v;
};

export const sameValue = (a, b) => norm(a) === norm(b);

export const diffPayload = (payload, base) => {
    const out = {};
    for (const [key, value] of Object.entries(payload || {})) {
        if (!sameValue(value, base?.[key])) out[key] = value;
    }
    return out;
};

export const describeValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'sí' : 'no';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (typeof value === 'object') return 'configuración';
    return String(value);
};

export const HISTORY_COLUMNS = [
    ['label', 'Nombre'],
    ['slug', 'Nombre en URL'],
    ['node_type', 'Tipo de nodo'],
    ['parent_id', 'Padre'],
    ['sort_order', 'Orden'],
    ['hidden_in_menu', 'Oculta en menú'],
    ['disabled', 'Fuera de servicio'],
    ['workspace_alias', 'Workspace'],
    ['geoserver_layer', 'Capa de GeoServer'],
    ['styles', 'Estilos'],
    ['cql_filter', 'Filtro CQL'],
    ['wms_group', 'Grupo WMS'],
    ['tiled', 'Teselado'],
    ['image_format', 'Formato de imagen'],
    ['antialias', 'Suavizado'],
    ['wfs_available', 'Descarga WFS'],
    ['geometry_type', 'Tipo de geometría'],
    ['downloadable', 'Descargable'],
    ['time_enabled', 'Soporte temporal'],
    ['default_date', 'Fecha por defecto'],
    ['time_style_pattern', 'Patrón de estilo temporal'],
    ['hide_periodicity', 'Ocultar periodicidad'],
    ['search_tags', 'Etiquetas de búsqueda'],
    ['has_municipio', 'Filtro por municipio'],
    ['municipio_field', 'Campo de municipio'],
    ['municipio_field_type', 'Tipo de campo de municipio'],
    ['icon_url', 'Ícono'],
    ['highlight_color', 'Color de resaltado'],
    ['highlight_shape', 'Forma de resaltado'],
].map(([key, title]) => ({ key, title }));
