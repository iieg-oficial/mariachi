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

export const METADATA_FIELDS = {
    layer_name_usuario: 'Nombre para el usuario',
    descripcion: 'Descripción',
    fuentes: 'Fuentes',
    metodologia: 'Metodología',
    metadato: 'Metadato',
    frecuencia: 'Frecuencia',
    fecha_ultima: 'Última actualización',
    tipo_mapa: 'Tipo de mapa',
    tipo_mapa_enlace: 'Enlace del tipo de mapa',
    texto_leyenda: 'Texto de la leyenda',
    tarjeta_punto_poligono: 'Tarjeta punto/polígono',
    link_final_capa: 'Enlace final de la capa',
    downloadable: 'Descargable',
};

export const STATS_FIELDS = {
    stats_config: 'Indicadores',
    pie_numeralia: 'Nota al pie',
    ttl_minutes: 'Vigencia del cálculo',
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

export const sectionOf = (field) => {
    if (STATS_FIELDS[field]) return 'Estadísticas';
    if (METADATA_FIELDS[field]) return 'Metadatos';
    return FIELD_SECTIONS[field] || 'Servicios';
};

export const labelOf = (field) => STATS_FIELDS[field] || METADATA_FIELDS[field] || FIELD_LABELS[field] || field;

const estable = (v) => {
    if (Array.isArray(v)) return v.map(estable);
    if (v && typeof v === 'object') {
        return Object.keys(v).sort().reduce((acc, k) => {
            if (v[k] !== undefined) acc[k] = estable(v[k]);
            return acc;
        }, {});
    }
    return v;
};

const vacio = (v) => v === undefined || v === null || v === ''
    || (Array.isArray(v) && v.length === 0)
    || (typeof v === 'object' && Object.keys(v).length === 0);

const norm = (v) => {
    if (vacio(v)) return null;
    if (typeof v === 'object') return JSON.stringify(estable(v));
    return String(v);
};

export const sameValue = (a, b) => norm(a) === norm(b);

export const diffPayload = (payload, base) => {
    const out = {};
    for (const [key, value] of Object.entries(payload || {})) {
        if (!sameValue(value, base?.[key])) out[key] = value;
    }
    return out;
};

const ETIQUETA_DE_ITEM = ['nombre', 'corto', 'largo', 'texto', 'label', 'titulo', 'enlace'];

const describeItem = (item) => {
    if (item === null || item === undefined) return null;
    if (typeof item !== 'object') return String(item);
    for (const campo of ETIQUETA_DE_ITEM) {
        const v = item[campo];
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
};

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`;

export const describeValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'sí' : 'no';
    if (Array.isArray(value)) {
        if (value.length === 0) return '—';
        const etiquetas = value.map(describeItem).filter(Boolean);
        if (etiquetas.length === value.length) return etiquetas.join(' · ');
        return plural(value.length, 'elemento', 'elementos');
    }
    if (typeof value === 'object') {
        const etiqueta = describeItem(value);
        if (etiqueta) return etiqueta;
        const claves = Object.keys(value).length;
        return claves ? plural(claves, 'ajuste', 'ajustes') : '—';
    }
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

export const METADATA_HISTORY_COLUMNS = [
    ['layer_key', 'Feature type'],
    ['workspace', 'Workspace'],
    ['layer_name_db', 'Nombre en la base'],
    ['layer_name_usuario', 'Nombre para el usuario'],
    ['descripcion', 'Descripción'],
    ['fuentes', 'Fuentes'],
    ['metodologia', 'Metodología'],
    ['metadato', 'Metadato'],
    ['frecuencia', 'Frecuencia'],
    ['fecha_ultima', 'Última actualización'],
    ['tipo_mapa', 'Tipo de mapa'],
    ['tipo_mapa_enlace', 'Enlace del tipo de mapa'],
    ['texto_leyenda', 'Texto de la leyenda'],
    ['tarjeta_punto_poligono', 'Tarjeta punto/polígono'],
    ['link_final_capa', 'Enlace final de la capa'],
    ['downloadable', 'Descargable'],
    ['stats_config', 'Indicadores'],
    ['pie_numeralia', 'Nota al pie'],
    ['ttl_minutes', 'Vigencia del cálculo'],
].map(([key, title]) => ({ key, title }));
