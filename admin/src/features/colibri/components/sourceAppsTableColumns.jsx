import { Button, Popconfirm, Space, Switch, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, KeyOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function buildSourceAppsColumns({
    actingId,
    onRotate,
    onToggleActivo,
    onEdit,
    onDelete,
}) {
    return [
        {
            title: 'App',
            dataIndex: 'nombre',
            render: (nombre, record) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{nombre}</Text>
                    <Text code style={{ fontSize: 11 }}>{record.slug}</Text>
                </Space>
            ),
        },
        {
            title: 'API Key',
            dataIndex: 'apiKeyPrefix',
            width: 200,
            render: (prefix, record) => (
                record.hasApiKey ? (
                    <Space orientation="vertical" size={0}>
                        <Text code>{prefix}…</Text>
                        <Button
                            size="small"
                            type="link"
                            icon={<KeyOutlined />}
                            onClick={() => onRotate(record)}
                            style={{ padding: 0, height: 'auto' }}
                        >
                            Rotar
                        </Button>
                    </Space>
                ) : (
                    <Button
                        size="small"
                        type="primary"
                        icon={<KeyOutlined />}
                        loading={actingId === record.id}
                        onClick={() => onRotate(record)}
                    >
                        Generar key
                    </Button>
                )
            ),
        },
        {
            title: 'Dominios',
            dataIndex: 'dominiosPermitidos',
            responsive: ['md'],
            render: (list) => (
                list?.length ? (
                    <Space wrap size={4}>
                        {list.slice(0, 3).map((d) => <Tag key={d}>{d}</Tag>)}
                        {list.length > 3 && <Tooltip title={list.slice(3).join(', ')}><Tag>+{list.length - 3}</Tag></Tooltip>}
                    </Space>
                ) : <Text type="secondary">—</Text>
            ),
        },
        {
            title: 'Tipos',
            dataIndex: 'tiposPermitidos',
            responsive: ['lg'],
            render: (list) => (
                list?.length ? (
                    <Space wrap size={4}>
                        {list.map((t) => <Tag key={t}>{t}</Tag>)}
                    </Space>
                ) : <Text type="secondary">Todos</Text>
            ),
        },
        {
            title: 'Rate/h',
            dataIndex: 'rateLimitPerHour',
            width: 90,
            responsive: ['lg'],
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            width: 90,
            render: (value, record) => (
                <Switch
                    checked={value}
                    loading={actingId === record.id}
                    disabled={!record.hasApiKey}
                    onChange={(checked) => onToggleActivo(record, checked)}
                />
            ),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 130,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
                    <Popconfirm
                        title="¿Eliminar source app?"
                        description="Solo se puede eliminar si ningún reporte lo referencia."
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDelete(record)}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />} loading={actingId === record.id} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];
}
