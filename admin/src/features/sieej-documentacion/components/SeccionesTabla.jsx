import { Button, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import {
    DeleteOutlined, EditOutlined, EyeInvisibleOutlined, EyeOutlined, RollbackOutlined,
} from '@ant-design/icons';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DragHandleCell, SortableTableRow } from '@shared/components/SortableTableRow';
import { TIPOS } from '../constants/secciones';

const { Text } = Typography;
const COMPONENTES = { body: { row: SortableTableRow } };

const origenTag = (s, readmeCommit) => {
    if (s.origen !== 'readme') return <Tag>Manual</Tag>;
    if (!s.editada) return <Tag color="blue">README</Tag>;
    const cambio = readmeCommit && s.readme_commit !== readmeCommit;
    return (
        <Space size={4}>
            <Tag color="orange">Editada</Tag>
            {cambio && (
                <Tooltip title="El README cambió desde que se editó; restablecer trae su versión nueva">
                    <Tag color="warning">README cambió</Tag>
                </Tooltip>
            )}
        </Space>
    );
};

export default function SeccionesTabla({ secciones, readmeCommit, soloLectura, onCambiar, onEditar, onRestablecer }) {
    const sensores = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const alSoltar = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const desde = secciones.findIndex((s) => s.id === active.id);
        const hasta = secciones.findIndex((s) => s.id === over.id);
        onCambiar(arrayMove(secciones, desde, hasta));
    };

    const alternar = (id) => onCambiar(secciones.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));

    const columnas = [
        { key: 'arrastre', width: 40, render: () => <DragHandleCell disabled={soloLectura} /> },
        {
            title: 'Sección',
            dataIndex: 'titulo',
            render: (titulo, s) => (
                <Space direction="vertical" size={0}>
                    <Text strong delete={!s.visible}>{titulo}</Text>
                    <Text type="secondary">{TIPOS[s.tipo]?.etiqueta}{TIPOS[s.tipo]?.medida ? ' · datos del sincronizador' : ''}</Text>
                </Space>
            ),
        },
        { title: 'Origen', key: 'origen', render: (_, s) => origenTag(s, readmeCommit) },
        {
            title: '',
            key: 'acciones',
            align: 'right',
            render: (_, s) => (
                <Space size={4}>
                    <Tooltip title={s.visible ? 'Ocultar' : 'Mostrar'}>
                        <Button type="text" disabled={soloLectura} icon={s.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />} onClick={() => alternar(s.id)} />
                    </Tooltip>
                    <Tooltip title="Editar">
                        <Button type="text" icon={<EditOutlined />} onClick={() => onEditar(s)} />
                    </Tooltip>
                    {s.origen === 'readme' && (
                        <Popconfirm title="¿Volver al texto del README?" onConfirm={() => onRestablecer(s)} disabled={soloLectura}>
                            <Tooltip title="Restablecer desde el README">
                                <Button type="text" disabled={soloLectura} icon={<RollbackOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                    <Popconfirm title="¿Quitar esta sección del borrador?" onConfirm={() => onCambiar(secciones.filter((x) => x.id !== s.id))} disabled={soloLectura}>
                        <Tooltip title="Quitar">
                            <Button type="text" danger disabled={soloLectura} icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
            <SortableContext items={secciones.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <Table
                    size="middle"
                    rowKey="id"
                    columns={columnas}
                    dataSource={secciones}
                    pagination={false}
                    components={COMPONENTES}
                    locale={{ emptyText: 'Esta página no tiene secciones' }}
                />
            </SortableContext>
        </DndContext>
    );
}
