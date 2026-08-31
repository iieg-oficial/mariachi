import {
    AppstoreOutlined,
    BlockOutlined,
    BorderOutlined,
    EnvironmentOutlined,
    EyeInvisibleOutlined,
    FilterOutlined,
    FolderOutlined,
    LineOutlined,
    WarningOutlined,
} from '@ant-design/icons';

export const NODE_SHAPE = {
    tema: 'band',
    category: 'header',
    label: 'rule',
    group: 'box',
    leaf: 'row',
    'evento-root': 'band',
    evento: 'header',
    'evento-categoria': 'header',
    'evento-etiqueta': 'rule',
    'evento-capa': 'row',
};

export const shapeOf = (nodeType) => NODE_SHAPE[nodeType] || 'row';

export const isOrganizer = (nodeType) => {
    const shape = shapeOf(nodeType);
    return shape === 'band' || shape === 'header' || shape === 'rule';
};

const GEOMETRY_ICON = {
    point: EnvironmentOutlined,
    multipoint: EnvironmentOutlined,
    line: LineOutlined,
    linestring: LineOutlined,
    multilinestring: LineOutlined,
    polygon: BorderOutlined,
    multipolygon: BorderOutlined,
};

const geometryIconType = (geometryType) => {
    const key = String(geometryType || '').toLowerCase();
    return GEOMETRY_ICON[key] || BorderOutlined;
};

const nodeIconType = (node) => {
    if (node.nodeType === 'group') return BlockOutlined;
    if (node.nodeType === 'category' || node.nodeType === 'evento-categoria') return FolderOutlined;
    if (node.nodeType === 'tema' || node.nodeType === 'evento' || node.nodeType === 'evento-root') return AppstoreOutlined;
    if (node.isProperty) return FilterOutlined;
    return geometryIconType(node.geometryType);
};

export const nodeIcon = (node, props) => {
    const Component = nodeIconType(node);
    return <Component {...props} />;
};

export const STATE_PILLS = [
    {
        key: 'hiddenInMenu',
        label: 'oculta',
        color: 'orange',
        Icon: EyeInvisibleOutlined,
        title: 'No aparece en el árbol del visor, pero sigue abriéndose por URL',
    },
    {
        key: 'disabled',
        label: 'fuera de servicio',
        color: 'red',
        Icon: WarningOutlined,
        title: 'En mantenimiento o sin datos. El visor la muestra atenuada y no deja encenderla',
    },
];

export const INDENT_STEP = 16;
export const INDENT_STEP_MOBILE = 12;
