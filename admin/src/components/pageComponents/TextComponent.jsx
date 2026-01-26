export default function TextComponent({ content, fontSize, color, editable, onChange }) {
    if (editable) {
        return (
            <textarea
                value={content}
                onChange={(e) => onChange({ content: e.target.value })}
                style={{
                    width: '100%',
                    minHeight: 100,
                    padding: 8,
                    fontSize: fontSize || 14,
                    color: color || '#000000',
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    fontFamily: 'inherit',
                    resize: 'vertical'
                }}
            />
        );
    }

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
