import { Empty, Space, Table, Tag, Typography } from 'antd';

const { Text } = Typography;

const ORIGEN_TAG = {
    captura: { color: 'blue', label: 'Captura' },
    correccion: { color: 'gold', label: 'Corrección' },
};

const fmt = (v) => (v ? new Date(v).toLocaleString() : '—');

const valor = (v) => {
    if (v === null || v === undefined || v === '') return '(vacío)';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
};

const columnas = [
    {
        title: 'Campo',
        dataIndex: 'field_label',
        width: 170,
        render: (value, record) => (
            <Text style={{ fontSize: 12 }}>{value || record.field_path}</Text>
        ),
    },
    {
        title: 'Cambio',
        dataIndex: 'valor_nuevo',
        render: (_value, record) => (
            <Space size={4} wrap style={{ fontSize: 12 }}>
                <Text delete type="secondary" style={{ fontSize: 12 }}>
                    {valor(record.valor_anterior)}
                </Text>
                <Text type="secondary">→</Text>
                <Text strong style={{ fontSize: 12 }}>{valor(record.valor_nuevo)}</Text>
            </Space>
        ),
    },
    {
        title: 'Quién',
        dataIndex: 'actor_nombre',
        width: 170,
        render: (value, record) => (
            <Space orientation="vertical" size={0}>
                <Text style={{ fontSize: 12 }}>{value || 'Sin registrar'}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{fmt(record.cambiado_en)}</Text>
            </Space>
        ),
    },
    {
        title: 'Origen',
        dataIndex: 'origen',
        width: 100,
        render: (value) => {
            const tag = ORIGEN_TAG[value] || { color: 'default', label: value || '—' };
            return <Tag color={tag.color} style={{ fontSize: 11 }}>{tag.label}</Tag>;
        },
    },
];

export default function EnvioAuditoriaTab({ historial = [] }) {
    if (!historial.length) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin cambios registrados" />;
    }
    return (
        <Table
            size="small"
            rowKey={(r) => `${r.field_path}-${r.cambiado_en}`}
            columns={columnas}
            dataSource={[...historial].sort(
                (a, b) => new Date(b.cambiado_en) - new Date(a.cambiado_en),
            )}
            pagination={historial.length > 20 ? { pageSize: 20, size: 'small' } : false}
        />
    );
}
