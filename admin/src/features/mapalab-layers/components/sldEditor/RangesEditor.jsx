import { Button, InputNumber, Space, Table, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function RangesEditor({ cortes = [], labels = [], onChange }) {
    const rows = labels.map((label, idx) => ({
        key: idx,
        idx,
        lower: cortes[idx],
        upper: cortes[idx + 1],
        label,
    }));

    const updateLabel = (idx, value) => {
        const next = labels.slice();
        next[idx] = value ?? '';
        onChange?.({ cortes, labels: next });
    };

    const updateCorte = (idx, value) => {
        const next = cortes.slice();
        next[idx] = value;
        onChange?.({ cortes: next, labels });
    };

    const addClass = () => {
        const lastUpper = cortes[cortes.length - 1];
        const newUpper = typeof lastUpper === 'number' ? lastUpper + 1 : null;
        onChange?.({
            cortes: [...cortes, newUpper],
            labels: [...labels, ''],
        });
    };

    const removeClass = (idx) => {
        if (labels.length <= 1) return;
        const nextCortes = cortes.slice();
        nextCortes.splice(idx + 1, 1);
        const nextLabels = labels.slice();
        nextLabels.splice(idx, 1);
        onChange?.({ cortes: nextCortes, labels: nextLabels });
    };

    const columns = [
        { title: '#', dataIndex: 'idx', width: 40, render: (i) => `c${i + 1}` },
        {
            title: 'Lower',
            dataIndex: 'lower',
            width: 110,
            render: (v, r) => (
                <InputNumber
                    value={v}
                    onChange={(val) => updateCorte(r.idx, val)}
                    placeholder="null"
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Upper',
            dataIndex: 'upper',
            width: 110,
            render: (v, r) => (
                <InputNumber
                    value={v}
                    onChange={(val) => updateCorte(r.idx + 1, val)}
                    placeholder="null"
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Etiqueta de leyenda',
            dataIndex: 'label',
            render: (v, r) => (
                <input
                    type="text"
                    value={v}
                    onChange={(e) => updateLabel(r.idx, e.target.value)}
                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 4 }}
                />
            ),
        },
        {
            title: '',
            width: 50,
            render: (_, r) => (
                <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeClass(r.idx)}
                    disabled={labels.length <= 1}
                />
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
                Cada fila es una clase del coroplético. <code>null</code> en lower o upper deja el extremo abierto.
            </Text>
            <Table
                size="small"
                columns={columns}
                dataSource={rows}
                pagination={false}
                bordered
            />
            <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addClass}
                block
            >
                Agregar clase
            </Button>
        </Space>
    );
}
