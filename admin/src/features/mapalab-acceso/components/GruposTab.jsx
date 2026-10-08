import { Button, Popconfirm, Space, Table, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons';
import { textoDeConteo } from '@features/mapalab-acceso/utils/arbolOpciones';

const { Text } = Typography;

export default function GruposTab({ grupos, cargando, onNuevo, onEditar, onEliminar }) {
    const columnas = [
        {
            title: 'Grupo',
            key: 'grupo',
            render: (_, g) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{g.nombre}</Text>
                    {g.descripcion && <Text type="secondary" style={{ fontSize: 12 }}>{g.descripcion}</Text>}
                </Space>
            ),
        },
        { title: 'Personas', key: 'miembros', render: (_, g) => textoDeConteo(g.miembros.length, 'persona', 'personas') },
        { title: 'Capas', dataIndex: 'capas', key: 'capas', render: (n) => textoDeConteo(n, 'capa', 'capas') },
        {
            title: '',
            key: 'acciones',
            width: 110,
            render: (_, g) => (
                <Space size={4}>
                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => onEditar(g)} aria-label={`Editar ${g.nombre}`} />
                    <Popconfirm title="¿Borrar el grupo?" description="Sus personas pierden el acceso que les daba" okText="Borrar" cancelText="Cancelar" onConfirm={() => onEliminar(g.id)}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`Borrar ${g.nombre}`} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Button type="primary" shape="round" icon={<TeamOutlined />} onClick={onNuevo}>Nuevo grupo</Button>
            <Table rowKey="id" columns={columnas} dataSource={grupos} loading={cargando} pagination={false} scroll={{ x: true }} locale={{ emptyText: 'Sin grupos' }} />
        </Space>
    );
}
