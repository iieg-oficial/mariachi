import { NODE_TYPE_LABELS } from '@features/mapalab-layers/constants/nodeTypes';

const VALID_PARENT_TYPES = ['tema', 'category', 'group'];

export const canBeParent = (nodeType) => VALID_PARENT_TYPES.includes(nodeType);

const decorate = (n, selectable) => ({
    value: n.key,
    title: `${n.title} · ${NODE_TYPE_LABELS[n.nodeType] || n.nodeType}`,
    selectable,
});

export function buildTreeSelectData(nodes) {
    return (nodes || []).map((n) => ({
        ...decorate(n, canBeParent(n.nodeType)),
        children: n.children?.length ? buildTreeSelectData(n.children) : undefined,
    }));
}

export function buildMoveTreeData(nodes, excludeId) {
    return (nodes || [])
        .filter((n) => n.key !== excludeId)
        .map((n) => ({
            ...decorate(n, canBeParent(n.nodeType)),
            children: n.children?.length ? buildMoveTreeData(n.children, excludeId) : undefined,
        }));
}
