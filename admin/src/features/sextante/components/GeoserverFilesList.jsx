import { Button, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import {
    CloudDownloadOutlined,
    CodeOutlined,
    DeleteOutlined,
    FolderOutlined,
} from '@ant-design/icons';
import { basename, extOf, workspaceLabel } from '@features/sextante/utils/geoserverFiles';

const { Text } = Typography;

const typeTag = (record) => {
    if (record.isDir) return <Tag color="orange">CARPETA</Tag>;
    const ext = extOf(record.name);
    const color = ['ttf', 'otf'].includes(ext) ? 'purple' : 'blue';
    return <Tag color={color}>{ext.toUpperCase()}</Tag>;
};

export default function GeoserverFilesList({
    folders = [],
    files = [],
    loading = false,
    fromSearch = false,
    deletingName,
    onOpenFolder,
    onDownloadZip,
    onSnippet,
    onDelete,
}) {
    const records = [
        ...folders.map((f) => ({ ...f, key: `folder-${f.path}`, isDir: true })),
        ...files.map((f) => ({ ...f, key: `file-${f.workspace || ''}-${f.name}`, isDir: false })),
    ];

    const columns = [
        {
            title: '',
            key: 'icon',
            width: 40,
            render: (_, record) => (
                <FolderOutlined
                    style={{ fontSize: 18, color: record.isDir ? '#FF8300' : '#bfbfbf' }}
                />
            ),
        },
        {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
            render: (_, record) => {
                const label = record.isDir ? record.name : basename(record.name);
                const full = record.isDir ? record.path : record.name;
                return (
                    <Space orientation="vertical" size={0} style={{ width: '100%' }}>
                        <Text strong style={{ wordBreak: 'break-all', color: record.isDir ? '#5C2472' : undefined }}>
                            {record.isDir ? `📁 ${label}` : label}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                            {fromSearch && !record.isDir ? `${workspaceLabel(record.workspace)}${full}` : full}
                        </Text>
                    </Space>
                );
            },
        },
        {
            title: 'Tipo',
            key: 'type',
            width: 110,
            responsive: ['sm'],
            render: (_, record) => typeTag(record),
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 110,
            align: 'right',
            render: (_, record) => (record.isDir ? (
                <Tooltip title="Descargar carpeta como ZIP">
                    <Button
                        size="small"
                        icon={<CloudDownloadOutlined />}
                        onClick={(e) => { e.stopPropagation(); onDownloadZip?.(record.path); }}
                    />
                </Tooltip>
            ) : (
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Ver snippet SLD">
                        <Button size="small" icon={<CodeOutlined />} onClick={() => onSnippet?.(record)} />
                    </Tooltip>
                    <Popconfirm
                        title="¿Eliminar este archivo?"
                        description="Si algún SLD lo está usando, dejará de renderearse."
                        okText="Eliminar"
                        okButtonProps={{ danger: true }}
                        cancelText="Cancelar"
                        onConfirm={() => onDelete?.(record.name, record.workspace || '')}
                    >
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={deletingName === record.name}
                        />
                    </Popconfirm>
                </Space>
            )),
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={records}
            rowKey="key"
            loading={loading}
            size="small"
            sticky={{ offsetHeader: 0 }}
            pagination={false}
            tableLayout="fixed"
            onRow={(record) => ({
                onClick: () => record.isDir && onOpenFolder?.(record.path),
                style: { cursor: record.isDir ? 'pointer' : 'default' },
            })}
            locale={{
                emptyText: (
                    <Space orientation="vertical" align="center" style={{ padding: 24 }}>
                        <FolderOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />
                        <Text type="secondary">Sin archivos en esta carpeta</Text>
                    </Space>
                ),
            }}
        />
    );
}
