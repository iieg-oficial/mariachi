import { useMemo, useState } from 'react';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, pointerWithin,
    useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, rectSwappingStrategy,
} from '@dnd-kit/sortable';
import { Empty } from 'antd';
import { ColumnGuides, RowDivider } from './LayoutControls';
import GapDropZone from './GapDropZone';
import { GRID_COLUMNS, cabeUnCampo } from './fieldLayout';

const gapId = (slot) => `gap-${slot.row}-${slot.col}`;

export default function FieldsGrid({
    slots, itemIds, unitsPorId, isMobile, vacio, vacioTexto, mostrarGuias,
    onDrop, onUnirLinea, onMoverLinea, onAddFieldEnLinea, renderField,
}) {
    const [dragging, setDragging] = useState(null);

    const unitsArrastrado = dragging ? unitsPorId?.get(dragging) ?? 0 : 0;
    const admiteElArrastre = (slot) => cabeUnCampo(slot.units) && unitsArrastrado <= slot.units;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const detectarDestino = (args) => {
        const bajoElPuntero = pointerWithin(args);
        return bajoElPuntero.length > 0 ? bajoElPuntero : closestCenter(args);
    };

    const gapPorId = useMemo(() => new Map(
        slots.filter((s) => s.kind === 'gap').map((s) => [gapId(s), s]),
    ), [slots]);

    const huecoEnLinea = useMemo(() => {
        const map = new Map();
        slots.filter((s) => s.kind === 'gap' && cabeUnCampo(s.units)).forEach((s) => {
            if (!map.has(s.row)) map.set(s.row, s);
        });
        return map;
    }, [slots]);

    const totalLineas = slots.length === 0 ? 0 : slots[slots.length - 1].row + 1;

    const libreEnLinea = (row) => slots
        .filter((s) => s.row === row && s.kind === 'gap' && cabeUnCampo(s.units))
        .reduce((acc, s) => acc + s.units, 0);

    const gapClickable = (gap) => !isMobile && cabeUnCampo(gap.units);

    const handleDragEnd = ({ active, over }) => {
        setDragging(null);
        if (!over || active.id === over.id) return;
        onDrop(active.id, over.id, gapPorId.get(over.id));
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={detectarDestino}
            onDragStart={({ active }) => setDragging(active.id)}
            onDragCancel={() => setDragging(null)}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={itemIds} strategy={rectSwappingStrategy}>
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
                        const primeroDeLinea = slots.find(
                            (s) => s.row === slot.row && s.kind === 'field',
                        );
                        const hueco = huecoEnLinea.get(slot.row);
                        const divider = abreLinea && totalLineas > 1
                            ? [<RowDivider
                                key={`divider-${slot.row}`}
                                index={slot.row}
                                free={libreEnLinea(slot.row)}
                                showFree={!isMobile}
                                showAddButton={!isMobile && !!hueco}
                                onAddEnLinea={hueco ? () => onAddFieldEnLinea?.(hueco) : undefined}
                                onUnir={slot.row > 0 && primeroDeLinea
                                    ? () => onUnirLinea?.(primeroDeLinea.idx)
                                    : undefined}
                                onSubir={slot.row > 0 ? () => onMoverLinea?.(slot.row, -1) : undefined}
                                onBajar={slot.row < totalLineas - 1
                                    ? () => onMoverLinea?.(slot.row, 1)
                                    : undefined}
                            />]
                            : [];
                        if (slot.kind === 'gap') {
                            return [
                                ...divider,
                                <GapDropZone
                                    key={`${gapId(slot)}-${i}`}
                                    id={gapId(slot)}
                                    gap={slot}
                                    activo={!!dragging && !isMobile && admiteElArrastre(slot)}
                                    clickable={gapClickable(slot)}
                                    onAddInGap={gapClickable(slot) ? () => onAddFieldEnLinea?.(slot) : undefined}
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
