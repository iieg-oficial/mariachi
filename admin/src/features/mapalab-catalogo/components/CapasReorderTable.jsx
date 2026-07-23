import { Table, Tag, Typography, message } from 'antd';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DragHandleCell, SortableTableRow } from '@shared/components/SortableTableRow';
import { reorderCapas } from '../api/catalogoService';

const { Text } = Typography;

const TABLE_COMPONENTS = { body: { row: SortableTableRow } };

const columns = [
    { title: '', key: 'sort', width: 40, render: () => <DragHandleCell /> },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Slug', dataIndex: 'slug', key: 'slug', render: (s) => <code>{s}</code> },
    { title: 'Workspace', dataIndex: 'workspaceAlias', key: 'workspaceAlias' },
    {
        title: 'Habilitada',
        dataIndex: 'enabled',
        key: 'enabled',
        width: 120,
        render: (enabled) => (enabled ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>),
    },
];

export default function CapasReorderTable({ capas, loading, onReorder }) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = async ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = capas.findIndex((c) => c.id === active.id);
        const to = capas.findIndex((c) => c.id === over.id);
        if (from < 0 || to < 0) return;
        const ordenado = arrayMove(capas, from, to);
        onReorder(ordenado);
        try {
            await reorderCapas(ordenado.map((c) => c.id));
        } catch {
            onReorder(capas);
            message.error('No se pudo guardar el nuevo orden');
        }
    };

    return (
        <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Arrastra el handle (≡) para reordenar las capas. El orden se guarda
                automáticamente y es el que se muestra en la vista pública del catálogo.
                Pulsa «Listo» para volver a la vista con filtros y búsqueda.
            </Text>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={capas.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={capas}
                        pagination={false}
                        components={TABLE_COMPONENTS}
                    />
                </SortableContext>
            </DndContext>
        </>
    );
}
