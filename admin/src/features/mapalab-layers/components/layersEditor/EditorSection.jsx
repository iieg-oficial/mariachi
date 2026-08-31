import { useState } from 'react';
import { Typography } from 'antd';
import { DownOutlined, RightOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function EditorSection({
    title,
    hint,
    children,
    first = false,
    collapsible = true,
    defaultOpen,
}) {
    const [open, setOpen] = useState(defaultOpen ?? first);
    const shown = !collapsible || open;

    const heading = (
        <>
            {collapsible && (
                <span style={{ color: '#8e97a8', fontSize: 10, marginRight: 7 }}>
                    {open ? <DownOutlined /> : <RightOutlined />}
                </span>
            )}
            <Text
                strong
                style={{
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#8e97a8',
                }}
            >
                {title}
            </Text>
        </>
    );

    return (
        <section
            style={{
                paddingTop: first ? 0 : 22,
                marginTop: first ? 0 : 22,
                borderTop: first ? 'none' : '1px solid #f0f0f0',
            }}
        >
            {collapsible ? (
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        textAlign: 'left',
                        border: 0,
                        background: 'transparent',
                        padding: 0,
                        cursor: 'pointer',
                        font: 'inherit',
                    }}
                >
                    {heading}
                </button>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>{heading}</div>
            )}
            {hint && shown && (
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                    {hint}
                </Text>
            )}
            <div style={{ marginTop: 14, display: shown ? 'block' : 'none' }}>{children}</div>
        </section>
    );
}
