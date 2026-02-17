export default function TextComponent({ content, fontSize = 14, color = '#000000', padding = 'medium' }) {
    const paddingMap = {
        none: '0',
        small: '16px 0',
        medium: '32px 0',
        large: '64px 0'
    };

    return (
        <div style={{
            fontSize,
            color,
            padding: paddingMap[padding] || '16px 0',
            lineHeight: '1.6'
        }}>
            <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
    );
}
