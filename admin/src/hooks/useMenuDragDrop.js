import { message } from 'antd';
import { getItemLevel } from '@utils/menuUtils';
import { MAX_LEVEL } from '@constants/menuConstants';

export const useMenuDragDrop = (menuItems, updateItemsOrder) => {
    const handleDrop = (info) => {
        const dropKey = info.node.key;
        const dragKey = info.dragNode.key;
        const dropPos = info.node.pos.split('-');
        const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

        const dragItem = menuItems.find(item => item.id === dragKey);
        const dropItem = menuItems.find(item => item.id === dropKey);

        if (!dragItem || !dropItem) return;

        let newParentId = null;

        if (!info.dropToGap) {
            newParentId = dropKey;
            const newParentLevel = getItemLevel(dropKey, menuItems);
            if (newParentLevel >= MAX_LEVEL) {
                message.error(`No se puede mover aquí. El nivel máximo es ${MAX_LEVEL}`);
                return;
            }
        } else {
            newParentId = dropItem.parentId;
        }

        const siblings = menuItems.filter(item => item.parentId === newParentId && item.id !== dragKey);
        siblings.sort((a, b) => a.order - b.order);

        let newOrder = 0;
        if (dropPosition === -1) {
            newOrder = 0;
        } else {
            newOrder = siblings.length;
        }

        const updatedItems = [...menuItems];
        const dragItemIndex = updatedItems.findIndex(item => item.id === dragKey);
        updatedItems[dragItemIndex] = {
            ...updatedItems[dragItemIndex],
            parentId: newParentId,
            order: newOrder
        };

        let orderIndex = 0;
        for (let i = 0; i < siblings.length; i++) {
            if (i === dropPosition) {
                orderIndex++;
            }
            const siblingIndex = updatedItems.findIndex(item => item.id === siblings[i].id);
            updatedItems[siblingIndex] = {
                ...updatedItems[siblingIndex],
                order: orderIndex
            };
            orderIndex++;
        }

        updateItemsOrder(updatedItems);
    };

    return {
        handleDrop
    };
};
