import { Card, Empty, Progress, Space, Tag, Typography } from 'antd';
import { BUTTON_LABELS } from '@features/mapalab-stats/constants';

const { Text } = Typography;

const ButtonsBar = ({ rows = [], loading }) => {
    if (!loading && rows.length === 0) {
        return (
            <Card title="Uso de botones" size="small">
                <Empty description="Sin clicks registrados aún" />
            </Card>
        );
    }

    const max = Math.max(...rows.map((r) => r.clicks), 1);

    return (
        <Card title="Uso de botones" size="small" loading={loading}>
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                {rows.map((row) => {
                    const label = BUTTON_LABELS[row.eventName] || row.eventName;
                    return (
                        <div key={row.eventName}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text>
                                    {label}{' '}
                                    <Tag style={{ marginLeft: 4 }} color="default">{row.eventName}</Tag>
                                </Text>
                                <Text>
                                    <strong>{row.clicks.toLocaleString()}</strong>{' '}
                                    <Text type="secondary" style={{ fontSize: 11 }}>· {row.uniqueSessions} sesiones</Text>
                                </Text>
                            </div>
                            <Progress percent={(row.clicks / max) * 100} showInfo={false} strokeColor="#5C2472" size="small" />
                        </div>
                    );
                })}
            </Space>
        </Card>
    );
};

export default ButtonsBar;
