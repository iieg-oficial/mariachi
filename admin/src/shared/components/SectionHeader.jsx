import { Link } from 'react-router';
import { Space, Typography } from 'antd';

const { Text } = Typography;

export default function SectionHeader({
    icon,
    title,
    subtitle,
    to,
    badge,
    actionLabel = 'Ver detalles',
    color = '#5C2472',
}) {
    return (
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {icon && <span style={{ fontSize: 20, color, display: 'inline-flex' }}>{icon}</span>}
                <Text strong style={{ fontSize: 18 }}>
                    {title}
                    {subtitle && (
                        <Text type="secondary" style={{ fontSize: 18, fontWeight: 400 }}> — {subtitle}</Text>
                    )}
                </Text>
                {badge}
            </span>
            {to && (
                <Link to={to}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{actionLabel} →</Text>
                </Link>
            )}
        </Space>
    );
}
