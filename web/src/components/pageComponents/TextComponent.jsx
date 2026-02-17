export default function TextComponent({ content, fontSize, color }) {
    return (
        <p
            style={{
                fontSize: fontSize || 14,
                color: color || '#000000',
                margin: 0,
                whiteSpace: 'pre-wrap'
            }}
        >
            {content}
        </p>
    );
}
