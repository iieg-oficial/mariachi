import { useMemo, useState } from 'react';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Empty } from 'antd';
import { ColumnGuides, RowDivider } from './LayoutControls';
import GapDropZone from './GapDropZone';
import { GRID_COLUMNS } from './fieldLayout';

const gapId = (slot) => `gap-${slot.row}-${slot.col}`;

export default function FieldsGrid({
    slots, itemIds, isMobile, vacio, vacioTexto, mostrarGuias, onDrop, renderField,
}) {
    const [dragging, setDragging] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const gapPorId = useMemo(() => new Map(
        slots.filter((s) => s.kind === 'gap').map((s) => [gapId(s), s]),
    ), [slots]);

    const totalLineas = slots.length === 0 ? 0 : slots[slots.length - 1].row + 1;

    const libreEnLinea = (row) => slots
        .filter((s) => s.row === row && s.kind === 'gap')
        .reduce((acc, s) => acc + s.units, 0);

    const handleDragEnd = ({ active, over }) => {
        setDragging(null);
        if (!over || active.id === over.id) return;
        onDrop(active.id, over.id, gapPorId.get(over.id));
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setDragging(active.id)}
            onDragCancel={() => setDragging(null)}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={itemIds} strategy={rectSortingStrategy}>
                <div style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : `repeat(${GRID_COLUMNS}, 1fr)`,
                    width: '100%',
                }}>
                    {vacio && (
                        <div style={{ gridColumn: '1 / -1', padding: 4, boxSizing: 'border-box' }}>
                            <Empty description={vacioTexto} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </div>
                    )}
                    {slots.flatMap((slot, i) => {
                        const abreLinea = slots.findIndex((s) => s.row === slot.row) === i;
                        const divider = abreLinea && totalLineas > 1
                            ? [<RowDivider
                                key={`divider-${slot.row}`}
                                index={slot.row}
                                free={libreEnLinea(slot.row)}
                                showFree={!isMobile}
                            />]
                            : [];
                        if (slot.kind === 'gap') {
                            return [
                                ...divider,
                                <GapDropZone
                                    key={`${gapId(slot)}-${i}`}
                                    id={gapId(slot)}
                                    gap={slot}
                                    activo={!!dragging && !isMobile}
                                />,
                            ];
                        }
                        return [...divider, renderField(slot.idx, slot)];
                    })}
                    {mostrarGuias && <ColumnGuides />}
                </div>
            </SortableContext>
        </DndContext>
    );
}
