import { Descriptions, Space, Table, Tag, Typography } from 'antd';
import { formatBulkValue } from '@features/mapalab-layers/constants/bulkIngestFields';

const { Title, Text } = Typography;

const render = (v) => {
    const s = formatBulkValue(v);
    if (s === '—') return <Text type="secondary">—</Text>;
    if (typeof v === 'object' && v !== null) return <pre style={{ margin: 0, fontSize: 12 }}>{s}</pre>;
    return s;
};

export default function ChangeDetail({ change }) {
    if (change.op === 'insert') {
        const meta = change.metadataValues || {};
        const stats = change.statsValues || {};
        return (
            <Space direction="vertical" style={{ width: '100%' }}>
                <Title level={5}>Metadata</Title>
                <Descriptions column={1} size="small" bordered>
                    {Object.entries(meta).map(([k, v]) => (
                        <Descriptions.Item key={k} label={k}>{render(v)}</Descriptions.Item>
                    ))}
                </Descriptions>
                {Object.keys(stats).length > 0 && (
                    <>
                        <Title level={5}>Numeralia / pie</Title>
                        <Descriptions column={1} size="small" bordered>
                            {Object.entries(stats).map(([k, v]) => (
                                <Descriptions.Item key={k} label={k}>{render(v)}</Descriptions.Item>
                            ))}
                        </Descriptions>
                    </>
                )}
            </Space>
        );
    }

    return (
        <Table
            dataSource={change.diffs.map((d, i) => ({ ...d, key: i }))}
            pagination={false}
            size="small"
            columns={[
                { title: 'Tabla', dataIndex: 'table', key: 'table', width: 140, render: (v) => <Tag>{v}</Tag> },
                { title: 'Columna', dataIndex: 'column', key: 'column', width: 200, render: (v) => <Text code>{v}</Text> },
                { title: 'Antes', dataIndex: 'fromValue', key: 'fromValue', render },
                { title: 'Después', dataIndex: 'toValue', key: 'toValue', render },
            ]}
        />
    );
}
