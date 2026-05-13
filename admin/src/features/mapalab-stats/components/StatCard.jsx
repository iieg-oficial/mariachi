import { Card, Statistic, Typography } from 'antd';

const { Text } = Typography;

const formatDuration = (seconds) => {
    if (!seconds || seconds < 1) return '—';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
};

const StatCard = ({ title, value, suffix, hint, color, format }) => {
    let displayValue = value;
    if (format === 'duration') displayValue = formatDuration(value);
    if (format === 'percent' && typeof value === 'number') displayValue = `${value}%`;

    return (
        <Card>
            <Statistic
                title={title}
                value={displayValue}
                suffix={suffix}
                valueStyle={color ? { color } : undefined}
            />
            {hint && <Text type="secondary" style={{ fontSize: 12 }}>{hint}</Text>}
        </Card>
    );
};

export default StatCard;
