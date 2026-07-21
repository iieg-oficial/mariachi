import { Typography } from 'antd';

const { Title, Text } = Typography;

export default function AcervoSectionHeader({ icon, title, description }) {
    return (
        <div>
            <Title level={4} style={{ margin: 0 }}>
                {icon && <span style={{ marginInlineEnd: 8, color: '#5C2472' }}>{icon}</span>}
                {title}
            </Title>
            {description && (
                <Text type="secondary" style={{ fontWeight: 400, whiteSpace: 'normal' }}>
                    {description}
                </Text>
            )}
        </div>
    );
}
