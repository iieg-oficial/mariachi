import { Button, Progress, Space, Tag, Tooltip, Typography } from 'antd';
import { CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { formatSize } from '@features/sextante/utils/geoserverFiles';

const { Text } = Typography;

const STATUS = {
    staged: { color: 'default', label: 'Por subir' },
    queued: { color: 'default', label: 'En cola' },
    uploading: { color: 'blue', label: 'Subiendo' },
    done: { color: 'green', label: 'Listo' },
    error: { color: 'red', label: 'Error' },
    skipped: { color: 'default', label: 'Omitido' },
};

export default function UploadQueueList({ items, maxHeight = 280, onRemove, onRetry }) {
    if (!items.length) return null;

    return (
        <div style={{ maxHeight, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item) => {
                const status = STATUS[item.status] || STATUS.queued;
                const reason = item.error || item.reason;
                return (
                    <div key={item.id ?? item.uid}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tooltip title={item.label || item.name}>
                                <Text ellipsis style={{ flex: 1, minWidth: 0 }} type={item.status === 'skipped' ? 'secondary' : undefined}>
                                    {item.label || item.name}
                                </Text>
                            </Tooltip>
                            <Space size={4}>
                                <Text type="secondary" style={{ fontSize: 11 }}>{formatSize(item.size)}</Text>
                                <Tag color={status.color} style={{ marginInlineEnd: 0 }}>
                                    {item.status === 'uploading' ? `${item.percent} %` : status.label}
                                </Tag>
                                {item.status === 'error' && onRetry && (
                                    <Button
                                        type="text"
                                        size="small"
                                        shape="circle"
                                        aria-label="Reintentar"
                                        icon={<ReloadOutlined />}
                                        onClick={() => onRetry(item)}
                                    />
                                )}
                                {item.status !== 'uploading' && onRemove && (
                                    <Button
                                        type="text"
                                        size="small"
                                        shape="circle"
                                        aria-label="Quitar"
                                        icon={<CloseOutlined />}
                                        onClick={() => onRemove(item)}
                                    />
                                )}
                            </Space>
                        </div>
                        {item.status === 'uploading' && (
                            <Progress percent={item.percent} size="small" showInfo={false} style={{ margin: 0 }} />
                        )}
                        {reason && item.status !== 'skipped' && (
                            <Text type="danger" style={{ fontSize: 11 }}>{reason}</Text>
                        )}
                        {item.status === 'skipped' && reason && (
                            <Text type="secondary" style={{ fontSize: 11 }}>{reason.replace(/^Omitido: /, '')}</Text>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
