import { Button, Card, Tooltip, Typography } from 'antd';
import { DownloadOutlined, FolderOpenOutlined, FolderOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function GeoserverFolderCard({ folder, onOpen, onDownloadZip }) {
    return (
        <Card size="small" hoverable onClick={() => onOpen?.(folder.path)} styles={{ body: { padding: 8 } }}>
            <div
                style={{
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
                    <Tooltip title="Descargar carpeta como ZIP">
                        <Button
                            size="small"
                            type="text"
                            icon={<DownloadOutlined />}
                            onClick={(e) => { e.stopPropagation(); onDownloadZip?.(folder.path); }}
                        />
                    </Tooltip>
                )}
            </div>
        </Card>
    );
}
