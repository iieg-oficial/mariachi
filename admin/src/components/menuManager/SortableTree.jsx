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
    verticalListSortingStrategy,
    arrayMove
} from '@dnd-kit/sortable';
import { message } from 'antd';
import SortableTreeItem from './SortableTreeItem';

export default function SortableTree({
    items,
    originalItems,
    customIcons,
    onReorder,
    onEdit
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

        const draggedItem = items.find(item => item.id === active.id);
        const targetItem = items.find(item => item.id === over.id);

        if (!draggedItem || !targetItem) return;

        if (draggedItem.parentId !== targetItem.parentId) {
            message.warning('Solo puedes reordenar items del mismo nivel');
            return;
        }

        const parentId = draggedItem.parentId;
        const siblings = items
            .filter(item => item.parentId === parentId)
            .sort((a, b) => a.order - b.order);

        const oldIndex = siblings.findIndex(item => item.id === active.id);
        const newIndex = siblings.findIndex(item => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex);

        const siblingIds = new Set(siblings.map(s => s.id));
        const updatedItems = items.map(item => {
            if (siblingIds.has(item.id)) {
                const newOrder = reorderedSiblings.findIndex(s => s.id === item.id);
                return { ...item, order: newOrder };
            }
            return item;
        });

        onReorder(updatedItems);
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
