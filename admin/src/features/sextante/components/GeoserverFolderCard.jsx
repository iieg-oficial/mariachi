import { Button, Card, Checkbox, Space, Tooltip, Typography } from 'antd';
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    FolderOpenOutlined,
    FolderOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export default function GeoserverFolderCard({
    folder,
    onOpen,
    onDownloadZip,
    editMode = false,
    selected = false,
    onToggleSelect,
    onRename,
    onDelete,
}) {
    return (
        <Card
            size="small"
            hoverable
            onClick={() => onOpen?.(folder.path)}
            style={selected ? { outline: '2px solid #5C2472', outlineOffset: -2 } : undefined}
            styles={{ body: { padding: 8 } }}
        >
            <div
                style={{
                    position: 'relative',
                    height: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fffbe6',
                    border: '1px dashed #faad14',
                    borderRadius: 4,
                    marginBottom: 6,
                    gap: 4,
                }}
            >
                {editMode && !folder.pending && (
                    <Checkbox
                        checked={selected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => onToggleSelect?.({ ...folder, isDir: true })}
                        style={{ position: 'absolute', top: 4, left: 4, zIndex: 2 }}
                    />
                )}
                <FolderOpenOutlined style={{ fontSize: 36, color: '#faad14' }} />
                {folder.pending && <Text type="warning" style={{ fontSize: 10 }}>(pendiente)</Text>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tooltip title={folder.path}>
                    <Text ellipsis style={{ flex: 1, fontSize: 12, minWidth: 0 }}>
                        <FolderOutlined style={{ marginRight: 4 }} />
                        {folder.name}
                    </Text>
                </Tooltip>
                {!folder.pending && (
                    <Space size={0} onClick={(e) => e.stopPropagation()}>
                        {editMode && (
                            <>
                                <Tooltip title="Renombrar carpeta">
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<EditOutlined />}
                                        onClick={() => onRename?.({ ...folder, isDir: true })}
                                    />
                                </Tooltip>
                                <Tooltip title="Eliminar carpeta y su contenido">
                                    <Button
                                        size="small"
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => onDelete?.(folder)}
                                    />
                                </Tooltip>
                            </>
                        )}
                        <Tooltip title="Descargar carpeta como ZIP">
                            <Button
                                size="small"
                                type="text"
                                icon={<DownloadOutlined />}
                                onClick={() => onDownloadZip?.(folder.path)}
                            />
                        </Tooltip>
                    </Space>
                )}
            </div>
        </Card>
    );
}
