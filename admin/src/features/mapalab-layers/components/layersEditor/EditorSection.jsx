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
    open: openProp,
    onOpenChange,
    id,
}) {
    const [openInterno, setOpenInterno] = useState(defaultOpen ?? first);
    const controlado = openProp !== undefined;
    const open = controlado ? openProp : openInterno;
    const shown = !collapsible || open;

    const alternar = () => {
        if (controlado) onOpenChange?.(!open);
        else setOpenInterno((v) => !v);
    };

    const heading = (
        <>
            {collapsible && (
                <span style={{ color: '#7385ab', fontSize: 11, lineHeight: 1, width: 14, flexShrink: 0 }}>
                    {open ? <DownOutlined /> : <RightOutlined />}
                </span>
            )}
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <Text strong style={{ fontSize: 14, color: '#1c2230', lineHeight: 1.35 }}>
                    {title}
                </Text>
                {hint && (
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.45 }}>
                        {hint}
                    </Text>
                )}
            </span>
        </>
    );

    const headingStyle = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        width: '100%',
        textAlign: 'left',
        border: 0,
        background: 'transparent',
        padding: 0,
        font: 'inherit',
        cursor: collapsible ? 'pointer' : 'default',
    };

    return (
        <section
            id={id}
            style={{
                paddingTop: first ? 0 : 28,
                marginTop: first ? 0 : 28,
                borderTop: first ? 'none' : '1px solid #e8ecf3',
            }}
        >
            {collapsible ? (
                <button type="button" onClick={alternar} aria-expanded={open} style={headingStyle}>
                    {heading}
                </button>
            ) : (
                <div style={headingStyle}>{heading}</div>
            )}
            <div style={{ marginTop: 20, display: shown ? 'block' : 'none' }}>{children}</div>
        </section>
    );
}
