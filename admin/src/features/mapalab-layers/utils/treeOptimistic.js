export function optimisticMoveRawTree(prevTree, layerId, newParentId) {
    const clone = JSON.parse(JSON.stringify(prevTree));

    let movedNode = null;

    const extractNode = (children) => {
        for (let i = 0; i < children.length; i++) {
            if (children[i].id === layerId) {
                return children.splice(i, 1)[0];
            }
            if (children[i].children?.length) {
                const found = extractNode(children[i].children);
                if (found) return found;
            }
        }
        return null;
    };

    movedNode = extractNode(clone);
    if (!movedNode) return null;

    movedNode.parent_id = newParentId ?? null;

    if (!newParentId) {
        clone.push(movedNode);
    } else {
        const addToParent = (children) => {
            for (const node of children) {
                if (node.id === newParentId) {
                    if (!node.children) node.children = [];
                    node.children.push(movedNode);
                    return true;
                }
                if (node.children?.length && addToParent(node.children)) return true;
            }
            return false;
        };
        if (!addToParent(clone)) return null;
    }

    return clone;
}

export function optimisticReorderRawTree(prevTree, parentId, orderedIds) {
    const clone = JSON.parse(JSON.stringify(prevTree));

    if (!parentId) {
        const byId = new Map(clone.map(c => [c.id, c]));
        return orderedIds.map(id => byId.get(id)).filter(Boolean);
    }

    const findAndReorder = (children) => {
        for (const node of children) {
            if (node.id === parentId) {
                if (!node.children) return false;
                const byId = new Map(node.children.map(c => [c.id, c]));
                node.children = orderedIds.map(id => byId.get(id)).filter(Boolean);
                return true;
            }
            if (node.children?.length && findAndReorder(node.children)) return true;
        }
        return false;
    };

    findAndReorder(clone);
    return clone;
}
