import { Space, Typography } from 'antd';

const { Title, Text } = Typography;

export default function SectionHeading({ icon, title, description, level = 3 }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <Space align="center" size={12}>
                {icon}
                <Title level={level} style={{ margin: 0 }}>{title}</Title>
            </Space>
            {description && (
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    {description}
                </Text>
            )}
        </div>
    );
}
