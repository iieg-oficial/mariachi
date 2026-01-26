import MenuItemNode from '@components/menuManager/MenuItemNode';

export const useMenuTreeBuilder = (menuItems, originalMenuItems, customIcons, handlers) => {
    const buildTreeData = (items, parentId = null, level = 1) => {
        return items
            .filter(item => item.parentId === parentId)
            .sort((a, b) => a.order - b.order)
            .map(item => {
                const children = buildTreeData(items, item.id, level + 1);
                const isNew = item.id?.toString().startsWith('temp-');
                const originalItem = originalMenuItems.find(orig => orig.id === item.id);
                const isModified = originalItem && JSON.stringify(originalItem) !== JSON.stringify(item);

                return {
                    key: item.id,
                    title: (
                        <MenuItemNode
                            item={item}
                            level={level}
                            customIcons={customIcons}
                            isNew={isNew}
                            isModified={isModified}
                            onAddChild={handlers.onAddChild}
                            onEdit={handlers.onEdit}
                            onDelete={handlers.onDelete}
                        />
                    ),
                    children: children.length > 0 ? children : undefined,
                    data: item
                };
            });
    };

    return {
        treeData: buildTreeData(menuItems)
    };
};
