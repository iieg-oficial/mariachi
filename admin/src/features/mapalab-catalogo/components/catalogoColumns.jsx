import { Button, Popconfirm, Space, Tag } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

export const buildColumns = ({ onEdit, onDelete }) => [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    { title: 'Slug', dataIndex: 'slug', key: 'slug', render: (s) => <code>{s}</code> },
    { title: 'Workspace', dataIndex: 'workspaceAlias', key: 'workspaceAlias' },
    { title: 'Capa GeoServer', dataIndex: 'geoserverLayer', key: 'geoserverLayer' },
    {
        title: 'Etiquetas',
        dataIndex: 'searchTags',
        key: 'searchTags',
        render: (tags) => (tags || []).map((t) => <Tag key={t}>{t}</Tag>),
    },
    {
        title: 'Habilitada',
        dataIndex: 'enabled',
        key: 'enabled',
        render: (v) => (v ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>),
    },
    {
        title: 'Acciones',
        key: 'acciones',
        width: 120,
        render: (_, capa) => (
            <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(capa)} />
                <Popconfirm
                    title="¿Eliminar esta capa del catálogo?"
                    okText="Eliminar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => onDelete(capa)}
                >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            </Space>
        ),
    },
];
