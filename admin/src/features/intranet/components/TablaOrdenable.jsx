import { Table } from 'antd';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DragHandleCell, SortableTableRow } from '@shared/components/SortableTableRow';

import { useOrden } from '../hooks/useOrden';

const FILA_ARRASTRABLE = { body: { row: SortableTableRow } };
const columnaArrastre = { key: 'arrastre', width: 48, render: () => <DragHandleCell /> };

const TablaOrdenable = ({ recurso, ordenable, filas, recargar, columnas, cargando, vacio, ...resto }) => {
    const { visibles, soltar } = useOrden(recurso, ordenable, filas, recargar);
    const sensores = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    return (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={soltar}>
            <SortableContext items={visibles.map((fila) => fila.id)} strategy={verticalListSortingStrategy}>
                <Table
                    rowKey="id"
                    size="middle"
                    loading={cargando}
                    dataSource={visibles}
                    components={ordenable ? FILA_ARRASTRABLE : undefined}
                    columns={[...(ordenable ? [columnaArrastre] : []), ...columnas]}
                    pagination={ordenable ? false : { pageSize: 20, hideOnSinglePage: true }}
                    locale={{ emptyText: vacio }}
                    scroll={{ x: 'max-content' }}
                    {...resto}
                />
            </SortableContext>
        </DndContext>
    );
};

export default TablaOrdenable;
