import { NODE_TYPE_LABELS } from '@features/mapalab-layers/constants/nodeTypes';

const VALID_PARENT_TYPES = ['tema', 'category', 'group'];

const canBeParent = (nodeType) => VALID_PARENT_TYPES.includes(nodeType);

const decorate = (n, selectable) => ({
    value: n.key,
    title: `${n.title} · ${NODE_TYPE_LABELS[n.nodeType] || n.nodeType}`,
    selectable,
});

export function buildMoveTreeData(nodes, excludeId) {
    return (nodes || [])
        .filter((n) => n.key !== excludeId)
        .map((n) => ({
            ...decorate(n, canBeParent(n.nodeType)),
            children: n.children?.length ? buildMoveTreeData(n.children, excludeId) : undefined,
        }));
}

export const RAIZ = '__raiz__';

export function buildParentOptions(nodes, prefijo = []) {
    return (nodes || []).flatMap((n) => {
        const ruta = [...prefijo, n.title];
        const propio = canBeParent(n.nodeType)
            ? [{
                value: n.key,
                ruta,
                label: ruta.join(' › '),
                nodeType: n.nodeType,
                tipo: NODE_TYPE_LABELS[n.nodeType] || n.nodeType,
            }]
            : [];
        const hijos = n.children?.length ? buildParentOptions(n.children, ruta) : [];
        return [...propio, ...hijos];
    });
}

export function rutaDeNodo(nodes, layerId) {
    if (!layerId) return null;
    const encontrado = buildParentOptions(nodes).find((o) => o.value === layerId);
    return encontrado ? encontrado.label : null;
}
