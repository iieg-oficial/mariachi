import { Space, Table, Typography } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';

const { Text } = Typography;

const columns = [
    {
        title: 'Archivo',
        dataIndex: 'name',
        key: 'name',
        render: (name) => {
            const basename = name.split('/').pop();
            return (
                <Space orientation="vertical" size={0} style={{ width: '100%' }}>
                    <Text strong style={{ wordBreak: 'break-all' }}>{basename}</Text>
                    <Text type="secondary" style={{ fontSize: 11, wordBreak: 'break-all' }}>{name}</Text>
                </Space>
            );
        },
    },
    {
        title: 'Tamaño',
        dataIndex: 'size',
        key: 'size',
        width: 90,
        align: 'right',
        responsive: ['sm'],
        render: (size) => {
            if (!size) return '—';
            const kb = size / 1024;
            return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
        },
    },
];

export default function BucketFileList({ records, loading, onPick }) {
    return (
        <Table
            columns={columns}
            dataSource={records}
            rowKey="name"
            loading={loading}
            size="small"
            sticky={{ offsetHeader: 0 }}
            pagination={false}
            tableLayout="fixed"
            onRow={(record) => ({
                onClick: () => onPick(record),
                style: { cursor: 'pointer' },
            })}
            locale={{
                emptyText: (
                    <Space orientation="vertical" align="center" style={{ padding: 24 }}>
                        <FolderOpenOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />
                        <Text type="secondary">Sin archivos en esta carpeta</Text>
                    </Space>
                ),
            }}
        />
    );
}
