import { Button, Card, Checkbox, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd';
import { CodeOutlined, DeleteOutlined, EditOutlined, FileImageOutlined } from '@ant-design/icons';
import GeoserverThumb from '@features/sextante/components/GeoserverThumb';
import { basename, extOf, isPreviewable, workspaceLabel } from '@features/sextante/utils/geoserverFiles';

const { Text } = Typography;

export default function GeoserverFileCard({
    file,
    fromSearch = false,
    deleting = false,
    onSnippet,
    onDelete,
    editMode = false,
    selected = false,
    onToggleSelect,
    onRename,
}) {
    const fileWorkspace = file.workspace || '';
    const displayPath = fromSearch ? `${workspaceLabel(fileWorkspace)}${file.name}` : file.name;

    return (
        <Card
            size="small"
            hoverable
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
                {editMode && (
                    <Checkbox
                        checked={selected}
                        onChange={() => onToggleSelect?.({ ...file, isDir: false })}
                        style={{ position: 'absolute', top: 4, left: 4, zIndex: 2 }}
                    />
                )}
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
                <Text ellipsis style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
                    {basename(file.name)}
                </Text>
            </Tooltip>
            <Space size={4} style={{ width: '100%', justifyContent: 'space-between' }}>
                <Tooltip title="Ver snippet SLD">
                    <Button size="small" icon={<CodeOutlined />} onClick={() => onSnippet?.(file)} />
                </Tooltip>
                {editMode && !fromSearch && (
                    <Tooltip title="Renombrar archivo">
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => onRename?.({ ...file, isDir: false })}
                        />
                    </Tooltip>
                )}
                <Popconfirm
                    title="¿Eliminar este archivo?"
                    description="Si algún SLD lo está usando, dejará de renderearse."
                    okText="Eliminar"
                    okButtonProps={{ danger: true }}
                    cancelText="Cancelar"
                    onConfirm={() => onDelete?.(file.name, fileWorkspace)}
                >
                    <Button size="small" danger icon={<DeleteOutlined />} loading={deleting} />
                </Popconfirm>
            </Space>
        </Card>
    );
}
