import { Button, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import {
    CloudDownloadOutlined,
    CodeOutlined,
    DeleteOutlined,
    EditOutlined,
    FolderOutlined,
} from '@ant-design/icons';
import {
    CONFIG_EXT,
    FONT_EXT,
    basename,
    extOf,
    workspaceLabel,
} from '@features/sextante/utils/geoserverFiles';

const { Text } = Typography;

const tagColor = (ext) => {
    if (FONT_EXT.includes(ext)) return 'purple';
    if (CONFIG_EXT.includes(ext)) return 'gold';
    return 'blue';
};

const typeTag = (record) => {
    if (record.isDir) return <Tag color="orange">CARPETA</Tag>;
    const ext = extOf(record.name);
    return <Tag color={tagColor(ext)}>{ext.toUpperCase()}</Tag>;
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
    editMode = false,
    isSelected,
    onReplaceSelection,
    onRename,
    onDeleteFolder,
}) {
    const records = [
        ...folders.map((f) => ({ ...f, key: `folder-${f.path}`, isDir: true })),
        ...files.map((f) => ({ ...f, key: `file-${f.workspace || ''}-${f.name}`, isDir: false })),
    ];

    const rowSelection = editMode ? {
        selectedRowKeys: records.filter((r) => isSelected?.(r)).map((r) => r.key),
        onChange: (_keys, rows) => onReplaceSelection?.(rows),
        getCheckboxProps: (record) => ({ disabled: Boolean(record.pending) }),
    } : undefined;

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
            width: editMode ? 170 : 110,
            align: 'right',
            render: (_, record) => (record.isDir ? (
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                    {editMode && !record.pending && (
                        <>
                            <Tooltip title="Renombrar carpeta">
                                <Button size="small" icon={<EditOutlined />} onClick={() => onRename?.(record)} />
                            </Tooltip>
                            <Tooltip title="Eliminar carpeta y su contenido">
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => onDeleteFolder?.(record)}
                                />
                            </Tooltip>
                        </>
                    )}
                    <Tooltip title="Descargar carpeta como ZIP">
                        <Button
                            size="small"
                            icon={<CloudDownloadOutlined />}
                            onClick={() => onDownloadZip?.(record.path)}
                        />
                    </Tooltip>
                </Space>
            ) : (
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Ver snippet SLD">
                        <Button size="small" icon={<CodeOutlined />} onClick={() => onSnippet?.(record)} />
                    </Tooltip>
                    {editMode && !fromSearch && (
                        <Tooltip title="Renombrar archivo">
                            <Button size="small" icon={<EditOutlined />} onClick={() => onRename?.(record)} />
                        </Tooltip>
                    )}
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
            rowSelection={rowSelection}
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
