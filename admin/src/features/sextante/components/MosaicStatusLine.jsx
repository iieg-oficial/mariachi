import { Badge, Space, Typography } from 'antd';

const { Text } = Typography;

export default function MosaicStatusLine({ status }) {
    if (!status) return null;
    const active = status.time_enabled && status.advertised;
    const range = status.first ? `${status.first} → ${status.last}` : 'sin fechas';
    return (
        <Space wrap size={12} style={{ marginBottom: 12 }}>
            <Badge
                status={active ? 'success' : 'warning'}
                text={active ? 'TIME activo' : 'TIME sin activar'}
            />
            <Text type="secondary">
                {status.store} · {status.periods} periodo(s) · {range}
            </Text>
            {status.pending.length > 0 && (
                <Text type="warning">{status.pending.length} archivo(s) sin cosechar</Text>
            )}
            {status.missing.length > 0 && (
                <Text type="warning">{status.missing.length} en el índice sin archivo</Text>
            )}
            {status.undated > 0 && (
                <Text type="danger">{status.undated} granulo(s) sin fecha</Text>
            )}
            {status.time_enabled && !status.advertised && (
                <Text type="danger">La GetCapabilities no anuncia TIME</Text>
            )}
        </Space>
    );
}
