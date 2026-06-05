export function buildTreeSelectData(nodes) {
    return (nodes || []).map((n) => ({
        value: n.key,
        title: n.title,
        children: n.children?.length ? buildTreeSelectData(n.children) : undefined,
    }));
}

export function buildMoveTreeData(nodes, excludeId) {
    return (nodes || [])
        .filter((n) => n.key !== excludeId)
        .map((n) => ({
            value: n.key,
            title: n.title,
            children: n.children?.length ? buildMoveTreeData(n.children, excludeId) : undefined,
        }));
}
