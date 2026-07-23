import { Button, Input, Popconfirm, Space } from 'antd';
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import TagsCell from './TagsCell';
import EnabledCell from './EnabledCell';

const textSearchProps = (dataIndex, label) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
            <Input
                placeholder={`Buscar ${label}`}
                value={selectedKeys[0]}
                onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                onPressEnter={() => confirm()}
                onKeyDown={(e) => e.stopPropagation()}
                style={{ marginBottom: 8, display: 'block', width: 200 }}
            />
            <Space>
                <Button type="primary" size="small" icon={<SearchOutlined />} onClick={() => confirm()}>
                    Buscar
                </Button>
                <Button size="small" onClick={() => { clearFilters?.(); confirm(); }}>
                    Limpiar
                </Button>
            </Space>
        </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />,
    onFilter: (value, record) => (record[dataIndex] || '')
        .toString()
        .toLowerCase()
        .includes(String(value).toLowerCase()),
});

export const buildColumns = ({ onDelete, workspaceFilters, tagFilters, tagOptions = [], onTagsSave, onEnabledSave }) => [
    {
        title: 'Nombre',
        dataIndex: 'nombre',
        key: 'nombre',
        sorter: (a, b) => a.nombre.localeCompare(b.nombre),
        ...textSearchProps('nombre', 'nombre'),
    },
    {
        title: 'Slug',
        dataIndex: 'slug',
        key: 'slug',
        render: (s) => <code>{s}</code>,
        ...textSearchProps('slug', 'slug'),
    },
    {
        title: 'Workspace',
        dataIndex: 'workspaceAlias',
        key: 'workspaceAlias',
        filters: workspaceFilters,
        onFilter: (value, record) => record.workspaceAlias === value,
    },
    {
        title: 'Capa GeoServer',
        dataIndex: 'geoserverLayer',
        key: 'geoserverLayer',
        ...textSearchProps('geoserverLayer', 'capa'),
    },
    {
        title: 'Etiquetas',
        dataIndex: 'searchTags',
        key: 'searchTags',
        width: 280,
        filters: tagFilters,
        onFilter: (value, record) => (record.searchTags || []).includes(value),
        render: (_, capa) => (
            <TagsCell capa={capa} tagOptions={tagOptions} onSave={onTagsSave} />
        ),
    },
    {
        title: 'Habilitada',
        dataIndex: 'enabled',
        key: 'enabled',
        width: 120,
        filters: [{ text: 'Sí', value: true }, { text: 'No', value: false }],
        onFilter: (value, record) => record.enabled === value,
        render: (_, capa) => <EnabledCell capa={capa} onSave={onEnabledSave} />,
    },
    {
        title: 'Acciones',
        key: 'acciones',
        width: 90,
        render: (_, capa) => (
            <Popconfirm
                title="¿Eliminar esta capa del catálogo?"
                okText="Eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(capa)}
            >
                <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
        ),
    },
];
