import { Typography, Input } from 'antd';

const { Title } = Typography;

export default function HeadingComponent({ content, level, color, editable, onChange }) {
    if (editable) {
        return (
            <Input
                value={content}
                onChange={(e) => onChange({ content: e.target.value })}
                style={{
                    fontSize: level === 1 ? 38 : level === 2 ? 30 : level === 3 ? 24 : 20,
                    fontWeight: 600,
                    color: color || '#000000'
                }}
            />
        );
    }

    return (
        <Title
            level={level || 2}
            style={{
                color: color || '#000000',
                margin: 0
            }}
        >
            {content}
        </Title>
    );
}
