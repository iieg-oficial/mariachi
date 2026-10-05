import { useState } from 'react';
import { Button, Popconfirm, Space, Table } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import PageHeading from '@shared/components/PageHeading';
import { DragHandleCell, SortableTableRow } from '@shared/components/SortableTableRow';
import { useAuth } from '@shared/contexts/useAuth';

import FormularioModal from './FormularioModal';
import { useOrden } from '../hooks/useOrden';
import { useRecurso } from '../hooks/useRecurso';

const PERMISO = 'mariachi.intranet.manage';
const FILA_ARRASTRABLE = { body: { row: SortableTableRow } };
const columnaArrastre = { key: 'arrastre', width: 48, render: () => <DragHandleCell /> };

const PaginaRecurso = ({ definicion, acciones, extra, level }) => {
    const { can } = useAuth();
    const puedeGestionar = can(PERMISO);
    const { filas, cargando, guardando, cargar, guardar, borrar } = useRecurso(
        definicion.recurso,
        { singular: definicion.singular },
    );
    const [abierto, setAbierto] = useState(false);
    const [enEdicion, setEnEdicion] = useState(null);
    const ordenable = puedeGestionar ? definicion.ordenable : null;
    const { visibles, soltar } = useOrden(definicion.recurso, ordenable, filas, cargar);
    const sensores = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const abrir = (fila = null) => {
        setEnEdicion(fila);
        setAbierto(true);
    };

    const alGuardar = async (valores) => {
        const payload = definicion.aPayload ? definicion.aPayload(valores, { edicion: Boolean(enEdicion) }) : valores;
        if (await guardar(payload, enEdicion?.id)) setAbierto(false);
    };

    const columnaAcciones = {
        title: 'Acciones',
        key: 'acciones',
        width: 160,
        render: (_, fila) => (
            <Space size={4}>
                {acciones?.(fila, cargar)}
                {definicion.editable !== false && (
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        aria-label={`Editar ${definicion.singular.toLowerCase()}`}
                        onClick={() => abrir(fila)}
                    />
                )}
                <Popconfirm
                    title={`¿Eliminar ${definicion.singular.toLowerCase()}?`}
                    okText="Eliminar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => borrar(fila.id)}
                >
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`Eliminar ${definicion.singular.toLowerCase()}`}
                    />
                </Popconfirm>
            </Space>
        ),
    };

    const campos = enEdicion && definicion.camposEdicion
        ? definicion.camposEdicion
        : definicion.campos;

    return (
        <>
            <PageHeading
                icon={definicion.icono}
                title={definicion.titulo}
                description={definicion.descripcion}
                level={level}
                extra={
                    <Space size={12}>
                        {extra}
                        {puedeGestionar && definicion.alta && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir()}>
                                {definicion.alta}
                            </Button>
                        )}
                    </Space>
                }
            />
            <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={soltar}>
                <SortableContext items={visibles.map((fila) => fila.id)} strategy={verticalListSortingStrategy}>
                    <Table
                        rowKey="id"
                        size="middle"
                        loading={cargando}
                        dataSource={visibles}
                        components={ordenable ? FILA_ARRASTRABLE : undefined}
                        columns={[
                            ...(ordenable ? [columnaArrastre] : []),
                            ...definicion.columnas,
                            ...(puedeGestionar ? [columnaAcciones] : []),
                        ]}
                        pagination={ordenable ? false : { pageSize: 20, hideOnSinglePage: true }}
                        locale={{ emptyText: definicion.vacio }}
                        scroll={{ x: 'max-content' }}
                    />
                </SortableContext>
            </DndContext>
            <FormularioModal
                abierto={abierto}
                titulo={enEdicion ? `Editar ${definicion.singular.toLowerCase()}` : definicion.alta}
                campos={campos}
                inicial={enEdicion}
                guardando={guardando}
                onCancelar={() => setAbierto(false)}
                onGuardar={alGuardar}
            />
        </>
    );
};

export default PaginaRecurso;
