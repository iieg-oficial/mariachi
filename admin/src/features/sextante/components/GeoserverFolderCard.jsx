import { useState } from 'react';
import { Card, Checkbox, Tooltip, Typography } from 'antd';
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    FolderOpenOutlined,
    FolderOutlined,
} from '@ant-design/icons';
import CardCornerAction from '@features/sextante/components/CardCornerAction';

const { Text } = Typography;

export default function GeoserverFolderCard({
    folder,
    isMobile = false,
    selected = false,
    anySelected = false,
    onOpen,
    onDownloadZip,
    onToggleSelect,
    onRename,
    onDelete,
}) {
    const [hover, setHover] = useState(false);
    const disponible = !folder.pending;
    const showActions = disponible && (hover || isMobile);
    const showCheckbox = disponible && (showActions || selected || anySelected);

    return (
        <Card
            size="small"
            hoverable
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
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
                <Checkbox
                    checked={selected}
                    aria-label={`Seleccionar carpeta ${folder.name}`}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleSelect?.({ ...folder, isDir: true })}
                    style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        zIndex: 2,
                        opacity: showCheckbox ? 1 : 0,
                        pointerEvents: showCheckbox ? 'auto' : 'none',
                        transition: 'opacity 0.15s',
                    }}
                />
                <CardCornerAction
                    corner="topRight"
                    visible={showActions}
                    title="Eliminar carpeta y su contenido"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => onDelete?.(folder)}
                />
                <CardCornerAction
                    corner="bottomLeft"
                    visible={showActions}
                    title="Renombrar carpeta"
                    icon={<EditOutlined />}
                    onClick={() => onRename?.({ ...folder, isDir: true })}
                />
                <CardCornerAction
                    corner="bottomRight"
                    visible={showActions}
                    title="Descargar carpeta como ZIP"
                    icon={<DownloadOutlined />}
                    onClick={() => onDownloadZip?.(folder.path)}
                />
                <FolderOpenOutlined style={{ fontSize: 36, color: '#faad14' }} />
                {folder.pending && <Text type="warning" style={{ fontSize: 10 }}>(pendiente)</Text>}
            </div>
            <Tooltip title={folder.path}>
                <Text ellipsis style={{ display: 'block', fontSize: 12 }}>
                    <FolderOutlined style={{ marginRight: 4 }} />
                    {folder.name}
                </Text>
            </Tooltip>
        </Card>
    );
}
