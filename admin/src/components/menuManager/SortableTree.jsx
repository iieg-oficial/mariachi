import { useMemo, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { message } from 'antd';
import SortableTreeItem from './SortableTreeItem';
import { getItemLevel } from '@utils/menuUtils';
import { MAX_LEVEL } from '@constants/menuConstants';

export default function SortableTree({
    items,
    originalItems,
    customIcons,
    onReorder,
    onEdit,
    onAddChild,
    onDelete
}) {
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    );

    const flattenTree = (items, parentId = null, level = 1) => {
        const result = [];
        const children = items
            .filter(item => item.parentId === parentId)
            .sort((a, b) => a.order - b.order);

        for (const item of children) {
            const itemChildren = items.filter(i => i.parentId === item.id);
            result.push({
                ...item,
                level,
                childCount: itemChildren.length
            });
            result.push(...flattenTree(items, item.id, level + 1));
        }
        return result;
    };

    const flatItems = useMemo(() => flattenTree(items), [items]);
    const itemIds = useMemo(() => flatItems.map(item => item.id), [flatItems]);

    const activeItem = activeId ? flatItems.find(item => item.id === activeId) : null;

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        const activeIndex = flatItems.findIndex(item => item.id === active.id);
        const overIndex = flatItems.findIndex(item => item.id === over.id);

        if (activeIndex === -1 || overIndex === -1) return;

        const draggedItem = flatItems[activeIndex];
        const targetItem = flatItems[overIndex];

        const newParentId = targetItem.parentId;

        if (newParentId) {
            const newParentLevel = getItemLevel(newParentId, items);
            if (newParentLevel >= MAX_LEVEL) {
                message.error(`No se puede mover aquí. El nivel máximo es ${MAX_LEVEL}`);
                return;
            }
        }

        const siblings = items
            .filter(item => item.parentId === newParentId && item.id !== draggedItem.id)
            .sort((a, b) => a.order - b.order);

        const targetSiblingIndex = siblings.findIndex(item => item.id === targetItem.id);

        const updatedItems = items.map(item => {
            if (item.id === draggedItem.id) {
                return {
                    ...item,
                    parentId: newParentId,
                    order: overIndex > activeIndex ? targetSiblingIndex + 1 : targetSiblingIndex
                };
            }
            return item;
        });

        let orderIndex = 0;
        const finalItems = updatedItems.map(item => {
            if (item.parentId === newParentId && item.id !== draggedItem.id) {
                const newOrder = orderIndex;
                if (orderIndex === (overIndex > activeIndex ? targetSiblingIndex + 1 : targetSiblingIndex)) {
                    orderIndex++;
                }
                orderIndex++;
                return { ...item, order: newOrder };
            }
            return item;
        });

        onReorder(finalItems);
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const isItemNew = (item) => item.id?.toString().startsWith('temp-');

    const isItemModified = (item) => {
        const original = originalItems.find(o => o.id === item.id);
        if (!original) return false;
        const { level, childCount, ...itemWithoutFlattenProps } = item;
        return JSON.stringify(original) !== JSON.stringify(itemWithoutFlattenProps);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                <div style={{ minHeight: 100 }}>
                    {flatItems.map(item => (
                        <SortableTreeItem
                            key={item.id}
                            item={item}
                            level={item.level}
                            childCount={item.childCount}
                            customIcons={customIcons}
                            isNew={isItemNew(item)}
                            isModified={isItemModified(item)}
                            onEdit={onEdit}
                            onAddChild={onAddChild}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay>
                {activeItem ? (
                    <div style={{
                        padding: '12px 16px',
                        background: '#1890ff',
                        color: '#fff',
                        borderRadius: 6,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        fontWeight: 500
                    }}>
                        {activeItem.label}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
