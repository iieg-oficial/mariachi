import { Button, Popconfirm, Space, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import TagsCell from './TagsCell';
import EnabledCell from './EnabledCell';
import InstitucionCell from './InstitucionCell';

const { Text } = Typography;

export const buildColumns = ({
    onDelete,
    tagOptions = [],
    tagFilters = [],
    onTagsSave,
    onEnabledSave,
    instituciones = [],
    onInstitucionSave,
}) => [
    {
        title: 'Nombre',
        dataIndex: 'nombre',
        key: 'nombre',
        sorter: (a, b) => a.nombre.localeCompare(b.nombre),
        render: (nombre, capa) => (
            <Space direction="vertical" size={0}>
                <Text strong>{nombre}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{capa.workspaceAlias}</Text>
            </Space>
        ),
    },
    {
        title: 'Institución',
        dataIndex: 'institucionId',
        key: 'institucionId',
        width: 200,
        filters: [
            ...instituciones.map((i) => ({ text: i.nombre, value: i.id })),
            { text: 'Sin institución', value: null },
        ],
        onFilter: (value, record) => (record.institucionId ?? null) === value,
        render: (_, capa) => (
            <InstitucionCell capa={capa} instituciones={instituciones} onSave={onInstitucionSave} />
        ),
    },
    {
        title: 'Etiquetas',
        dataIndex: 'searchTags',
        key: 'searchTags',
        width: 280,
        filters: tagFilters,
        filterSearch: true,
        onFilter: (value, record) => (record.searchTags || []).includes(value),
        render: (_, capa) => (
            <TagsCell capa={capa} tagOptions={tagOptions} onSave={onTagsSave} />
        ),
    },
    {
        title: 'Acciones',
        key: 'acciones',
        width: 150,
        render: (_, capa) => (
            <Space>
                <EnabledCell capa={capa} onSave={onEnabledSave} />
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

