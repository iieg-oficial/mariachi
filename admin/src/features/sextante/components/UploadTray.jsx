import { useState } from 'react';
import { Button, Progress, Typography, theme } from 'antd';
import { CloseOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import UploadQueueList from '@features/sextante/components/UploadQueueList';
import { useUploadQueue } from '@features/sextante/hooks/useUploadQueue';
import {
    clearFinishedUploads,
    removeUpload,
    retryUpload,
    summarizeUploads,
} from '@features/sextante/utils/uploadQueue';

const { Text } = Typography;
const { useToken } = theme;

export default function UploadTray() {
    const { token } = useToken();
    const [expanded, setExpanded] = useState(false);
    const queue = useUploadQueue();
    if (!queue.length) return null;

    const summary = summarizeUploads(queue);
    const heading = summary.active
        ? `Subiendo ${summary.position} de ${summary.total}`
        : `${summary.done} subido(s)`;

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed',
                right: 16,
                bottom: 16,
                zIndex: 999,
                width: 'min(360px, calc(100vw - 32px))',
                padding: '10px 14px',
                borderRadius: token.borderRadiusLG,
                background: token.colorBgElevated,
                boxShadow: token.boxShadowSecondary,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Text strong style={{ flex: 1 }}>
                    {heading}
                    {summary.failed > 0 && <Text type="danger">{` · ${summary.failed} con error`}</Text>}
                </Text>
                <Button
                    type="text"
                    size="small"
                    shape="circle"
                    aria-label={expanded ? 'Contraer' : 'Expandir'}
                    icon={expanded ? <DownOutlined /> : <UpOutlined />}
                    onClick={() => setExpanded((v) => !v)}
                />
                {!summary.active && (
                    <Button
                        type="text"
                        size="small"
                        shape="circle"
                        aria-label="Cerrar"
                        icon={<CloseOutlined />}
                        onClick={() => {
                            clearFinishedUploads();
                            setExpanded(false);
                        }}
                    />
                )}
            </div>
            <Progress
                percent={summary.percent}
                size="small"
                status={summary.failed && !summary.active ? 'exception' : undefined}
                style={{ margin: 0 }}
            />
            {!expanded && summary.current && (
                <Text type="secondary" ellipsis style={{ display: 'block', fontSize: 12 }}>
                    {summary.current.label}
                </Text>
            )}
            {expanded && (
                <div style={{ marginTop: 8 }}>
                    <UploadQueueList
                        items={queue}
                        maxHeight={320}
                        onRetry={(item) => retryUpload(item.id)}
                        onRemove={(item) => removeUpload(item.id)}
                    />
                </div>
            )}
        </div>
    );
}
