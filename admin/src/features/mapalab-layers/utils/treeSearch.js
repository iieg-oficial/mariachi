export const matchesQuery = (node, q) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return [node.title, node.workspaceAlias, node.geoserverLayer, node.key]
        .some((v) => String(v || '').toLowerCase().includes(needle));
};

export const flattenSelectable = (nodes, path = [], acc = []) => {
    for (const n of nodes || []) {
        if (n.nodeType !== 'label') acc.push({ node: n, path: [...path, n] });
        if (n.children?.length) flattenSelectable(n.children, [...path, n], acc);
    }
    return acc;
};

export const findPath = (nodes, targetKey, path = []) => {
    for (const n of nodes || []) {
        const here = [...path, n];
        if (n.key === targetKey) return here;
        if (n.children?.length) {
            const found = findPath(n.children, targetKey, here);
            if (found) return found;
        }
    }
    return null;
};

export const siblingsOf = (treeData, path) => {
    if (!path || path.length === 0) return [];
    const list = path.length === 1 ? treeData : (path[path.length - 2].children || []);
    return list.filter((n) => n.nodeType !== 'label');
};
