import { Space, Table, Typography } from 'antd';
import { FolderOpenOutlined, FolderOutlined } from '@ant-design/icons';
import { formatFileSize } from '@features/acervo/api/acervoService';

const { Text } = Typography;

export default function BucketFileList({ records, loading, onPick, onEnterDir }) {
    const columns = [
        {
            title: '',
            dataIndex: 'isDir',
            key: 'icon',
            width: 40,
            render: (isDir) => isDir
                ? <FolderOutlined style={{ fontSize: 18, color: '#FF8300' }} />
                : <FolderOpenOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />,
        },
        {
            title: 'Archivo',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => {
                const basename = record.originalName || name.split('/').pop();
                return (
                    <Space orientation="vertical" size={0} style={{ width: '100%' }}>
                        <Text strong style={{ wordBreak: 'break-all', color: record.isDir ? '#5C2472' : undefined }}>
                            {record.isDir ? `📁 ${basename}` : basename}
                        </Text>
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
            render: (size) => size ? formatFileSize(size) : '—',
        },
        {
            title: 'Fecha',
            dataIndex: 'uploadedAt',
            key: 'uploadedAt',
            width: 110,
            align: 'right',
            responsive: ['md'],
            render: (uploadedAt) => uploadedAt
                ? new Date(uploadedAt).toLocaleDateString('es-MX')
                : '—',
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={records}
            rowKey={(r) => r.name || r.id}
            loading={loading}
            size="small"
            sticky={{ offsetHeader: 0 }}
            pagination={false}
            tableLayout="fixed"
            onRow={(record) => ({
                onClick: () => record.isDir && onEnterDir ? onEnterDir(record) : onPick(record),
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
