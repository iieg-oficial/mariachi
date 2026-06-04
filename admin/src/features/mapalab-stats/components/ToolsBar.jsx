import { Card, Empty, Progress, Space, Tag, Typography } from 'antd';
import { TOOL_LABELS } from '@features/mapalab-stats/constants';

const { Text } = Typography;

const ToolsBar = ({ rows = [], loading }) => {
    if (!loading && rows.length === 0) {
        return (
            <Card title="Herramientas" size="small">
                <Empty description="Sin uso de herramientas registrado" />
            </Card>
        );
    }

    const max = Math.max(...rows.map((r) => r.uses), 1);

    return (
        <Card title="Herramientas (últimos 30 días)" size="small" loading={loading}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {rows.map((row) => (
                    <div key={`${row.eventName}-${row.tool}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text>
                                <Tag color={row.eventName === 'measurement_tool_use' ? 'blue' : 'purple'}>
                                    {TOOL_LABELS[row.eventName] || row.eventName}
                                </Tag>
                                {row.tool}
                            </Text>
                            <Text>
                                <strong>{row.uses.toLocaleString()}</strong>{' '}
                                <Text type="secondary" style={{ fontSize: 11 }}>· {row.uniqueSessions} sesiones</Text>
                            </Text>
                        </div>
                        <Progress percent={(row.uses / max) * 100} showInfo={false} strokeColor="#FF8300" size="small" />
                    </div>
                ))}
            </Space>
        </Card>
    );
};

export default ToolsBar;
