import { Tooltip } from 'antd';

const RESET = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: 0,
    border: 'none',
    background: 'none',
    font: 'inherit',
    cursor: 'help',
};

const Senal = ({ icono, texto, color, ayuda, pastilla = false, bg, children }) => {
    const estilo = pastilla
        ? {
            ...RESET,
            gap: 4,
            padding: '2px 10px',
            borderRadius: 999,
            background: bg,
            color,
            fontSize: 12,
        }
        : { ...RESET, color };

    return (
        <Tooltip title={ayuda} trigger={['hover', 'focus']} styles={{ root: { maxWidth: 360 } }}>
            <button type="button" aria-label={ayuda ? `${texto}. ${ayuda}` : texto} style={estilo}>
                {icono}
                {children || <span style={pastilla ? undefined : { fontSize: 13 }}>{texto}</span>}
            </button>
        </Tooltip>
    );
};

export default Senal;
