import { Typography } from 'antd';

const { Text } = Typography;

export default function AdvancedStack({ sections }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {sections.map((section, i) => (
                <section key={section.key}>
                    <Text
                        strong
                        style={{
                            display: 'block',
                            fontSize: 11,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: '#8e97a8',
                            paddingTop: i === 0 ? 0 : 24,
                            borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
                            marginBottom: 14,
                        }}
                    >
                        {section.title}
                    </Text>
                    {section.children}
                </section>
            ))}
        </div>
    );
}
