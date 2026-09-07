import { useState } from 'react';
import { Card, Checkbox, Tag, Tooltip, Typography } from 'antd';
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    FileImageOutlined,
} from '@ant-design/icons';
import CardCornerAction from '@features/sextante/components/CardCornerAction';
import GeoserverThumb from '@features/sextante/components/GeoserverThumb';
import { basename, extOf, isPreviewable, workspaceLabel } from '@features/sextante/utils/geoserverFiles';

const { Text } = Typography;

export default function GeoserverFileCard({
    file,
    fromSearch = false,
    isMobile = false,
    deleting = false,
    selected = false,
    anySelected = false,
    onToggleSelect,
    onRename,
    onDelete,
    onDownload,
}) {
    const [hover, setHover] = useState(false);
    const fileWorkspace = file.workspace || '';
    const displayPath = fromSearch ? `${workspaceLabel(fileWorkspace)}${file.name}` : file.name;
    const showActions = hover || isMobile;
    const showCheckbox = showActions || selected || anySelected;

    return (
        <Card
            size="small"
            hoverable
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
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
                    background: '#fafafa',
                    border: '1px dashed #f0f0f0',
                    borderRadius: 4,
                    marginBottom: 6,
                    overflow: 'hidden',
                    gap: 4,
                }}
            >
                <Checkbox
                    checked={selected}
                    aria-label={`Seleccionar ${basename(file.name)}`}
                    onChange={() => onToggleSelect?.({ ...file, isDir: false })}
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
                    title="Eliminar archivo"
                    icon={<DeleteOutlined />}
                    danger
                    loading={deleting}
                    confirm={{
                        title: '¿Eliminar este archivo?',
                        description: 'Si algún SLD lo está usando, dejará de renderearse.',
                    }}
                    onClick={() => onDelete?.(file.name, fileWorkspace)}
                />
                {!fromSearch && (
                    <CardCornerAction
                        corner="bottomLeft"
                        visible={showActions}
                        title="Renombrar archivo"
                        icon={<EditOutlined />}
                        onClick={() => onRename?.({ ...file, isDir: false })}
                    />
                )}
                <CardCornerAction
                    corner="bottomRight"
                    visible={showActions}
                    title="Descargar archivo"
                    icon={<DownloadOutlined />}
                    onClick={() => onDownload?.(file)}
                />
                {isPreviewable(file.name) ? (
                    <GeoserverThumb
                        src={file.downloadUrl}
                        alt={basename(file.name)}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                ) : (
                    <>
                        <FileImageOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                            {extOf(file.name)}
                        </Text>
                    </>
                )}
            </div>
            {fromSearch && (
                <Tag color={fileWorkspace ? 'blue' : 'default'} style={{ marginBottom: 4, fontSize: 10 }}>
                    {fileWorkspace || 'global'}
                </Tag>
            )}
            <Tooltip title={displayPath}>
                <Text ellipsis style={{ display: 'block', fontSize: 12 }}>
                    {basename(file.name)}
                </Text>
            </Tooltip>
        </Card>
    );
}
