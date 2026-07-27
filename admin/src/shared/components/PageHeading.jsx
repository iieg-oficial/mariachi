import { Space, Typography } from 'antd';
import { BRAND } from '@app/providers/brand';

const { Title, Text } = Typography;

export default function PageHeading({
    icon,
    title,
    description,
    level = 3,
    extra,
    marginBottom = 16,
}) {
    return (
        <div style={{ marginBottom }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
            }}>
                <Space align="center" size={12}>
                    {icon && (
                        <span style={{ fontSize: 24, color: BRAND.purple, display: 'inline-flex' }}>
                            {icon}
                        </span>
                    )}
                    <Title level={level} style={{ margin: 0 }}>{title}</Title>
                </Space>
                {extra}
            </div>
            {description && (
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    {description}
                </Text>
            )}
        </div>
    );
}
