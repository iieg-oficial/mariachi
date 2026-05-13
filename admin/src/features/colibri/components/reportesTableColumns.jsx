import { Button, Popconfirm, Space, Tag, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { ESTADO_COLORS, ESTADO_LABELS, formatDate } from '@features/colibri/constants';

const { Text } = Typography;

export function buildFlatColumns({
    isMobile,
    actingId,
    onOpen,
    onEliminar,
    tipoLabels,
    tipoColors,
}) {
    return [
        {
            title: 'Tipo',
            dataIndex: 'tipo',
            width: 130,
            render: (t) => <Tag color={tipoColors[t] || 'default'}>{tipoLabels[t] || t}</Tag>,
        },
        {
            title: 'Mensaje',
            dataIndex: 'mensaje',
            render: (text, record) => (
                <Space direction="vertical" size={0} style={{ maxWidth: 420 }}>
                    <Text
                        ellipsis={{ tooltip: text }}
                        style={{ display: 'block', maxWidth: 400 }}
                    >
                        {text}
                    </Text>
                    {record.sourceRoute && (
                        <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                            {record.sourceRoute}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            width: 120,
            render: (e) => <Tag color={ESTADO_COLORS[e]}>{ESTADO_LABELS[e]}</Tag>,
        },
        {
            title: 'Recibido',
            dataIndex: 'creadoEn',
            width: 150,
            responsive: ['md'],
            render: formatDate,
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: isMobile ? 90 : 180,
            render: (_, record) => (
                <Space size={4} wrap>
                    <Button size="small" onClick={() => onOpen(record.id)}>
                        {isMobile ? 'Ver' : 'Ver detalle'}
                    </Button>
                    <Popconfirm
                        title="¿Eliminar reporte?"
                        description="Esta acción no se puede deshacer."
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onEliminar(record)}
                    >
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={actingId === record.id}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];
}

export function buildGroupedColumns({ onOpen, tipoLabels, tipoColors }) {
    return [
        {
            title: 'Tipo',
            dataIndex: 'representanteTipo',
            width: 130,
            render: (t) => <Tag color={tipoColors[t] || 'default'}>{tipoLabels[t] || t}</Tag>,
        },
        {
            title: 'Mensaje (representante)',
            dataIndex: 'representanteMensaje',
            render: (text, r) => (
                <Space direction="vertical" size={0}>
                    <Text ellipsis style={{ maxWidth: 400 }}>{text}</Text>
                    {r.representanteSourceRoute && (
                        <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                            {r.representanteSourceRoute}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Ocurrencias',
            dataIndex: 'count',
            width: 110,
            sorter: (a, b) => a.count - b.count,
            defaultSortOrder: 'descend',
            render: (c) => <Tag color={c > 10 ? 'red' : c > 3 ? 'orange' : 'default'}>{c}</Tag>,
        },
        {
            title: 'Último visto',
            dataIndex: 'ultimoVisto',
            width: 150,
            render: (v) => formatDate(v),
        },
        {
            title: '',
            key: 'open',
            width: 110,
            render: (_, r) => (
                <Button size="small" onClick={() => onOpen(r.representanteId)}>
                    Ver representante
                </Button>
            ),
        },
    ];
}
