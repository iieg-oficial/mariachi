import { useState, useEffect } from 'react';
import { Button, Empty, Popconfirm, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons';
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SymbolPreview from '@features/mapalab-symbols/components/SymbolPreview';
import { reorderSymbols } from '@features/mapalab-symbols/api/symbolsService';
import { message } from '@shared/services/message';


function SortableSymbol({ sym, onEdit, onDelete, deletingId }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sym.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };
    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                position: 'relative',
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minHeight: 96,
            }}
        >
            <div
                {...attributes}
                {...listeners}
                style={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    cursor: 'grab',
                    color: '#bbb',
                    padding: 2,
                }}
                title="Arrastrar para reordenar"
            >
                <HolderOutlined style={{ fontSize: 12 }} />
            </div>
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 40,
                }}
            >
                <SymbolPreview symbol={sym} size={36} />
            </div>
            <Tag
                color={sym.kind === 'emoji' ? 'blue' : sym.kind === 'svg' ? 'purple' : 'green'}
                style={{ fontSize: 10, margin: 0 }}
            >
                {sym.kind}
            </Tag>
            <div style={{ display: 'flex', gap: 4 }}>
                <Tooltip title="Editar">
                    <Button size="small" icon={<EditOutlined />} onClick={() => onEdit?.(sym)} />
                </Tooltip>
                <Popconfirm
                    title="¿Borrar símbolo?"
                    okText="Borrar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => onDelete?.(sym)}
                >
                    <Button size="small" danger icon={<DeleteOutlined />} loading={deletingId === sym.id} />
                </Popconfirm>
            </div>
        </div>
    );
}


export default function SymbolGrid({ symbols, onEdit, onDelete, deletingId, onReorderSaved }) {
    const [orderedSymbols, setOrderedSymbols] = useState(symbols || []);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => {
        setOrderedSymbols(symbols || []);
    }, [symbols]);

    if (!symbols?.length) {
        return <Empty description="Sin símbolos en esta categoría" />;
    }

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = orderedSymbols.findIndex((s) => s.id === active.id);
        const newIndex = orderedSymbols.findIndex((s) => s.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const next = arrayMove(orderedSymbols, oldIndex, newIndex);
        setOrderedSymbols(next);
        try {
            await reorderSymbols(next.map((s, idx) => ({ id: s.id, sortOrder: idx })));
            onReorderSaved?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar orden');
            setOrderedSymbols(symbols);
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedSymbols.map((s) => s.id)} strategy={rectSortingStrategy}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                        gap: 12,
                    }}
                >
                    {orderedSymbols.map((sym) => (
                        <SortableSymbol
                            key={sym.id}
                            sym={sym}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            deletingId={deletingId}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
