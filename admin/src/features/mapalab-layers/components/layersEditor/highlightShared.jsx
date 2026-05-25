export const HighlightSwatch = ({ stroke, fill, shape = 'area' }) => {
    const baseStyle = {
        display: 'inline-block',
        width: 22,
        height: 22,
        marginRight: 8,
        verticalAlign: 'middle',
        borderRadius: 4,
    };
    if (shape === 'off') {
        return <span aria-hidden="true" style={{ ...baseStyle, border: '1px dashed #d9d9d9', background: 'transparent' }} />;
    }
    if (shape === 'linea') {
        return <span aria-hidden="true" style={{ ...baseStyle, border: `2px solid ${stroke}`, background: 'transparent' }} />;
    }
    return <span aria-hidden="true" style={{ ...baseStyle, border: `2px solid ${stroke}`, background: fill }} />;
};
