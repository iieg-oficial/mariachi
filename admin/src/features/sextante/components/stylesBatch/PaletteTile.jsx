import { Typography } from 'antd';

const { Text } = Typography;

const tileStyle = (selected) => ({
    display: 'grid',
    gap: 6,
    padding: 8,
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 8,
    background: 'transparent',
    border: selected ? '2px solid var(--ant-color-primary)' : '1px solid var(--ant-color-border)',
});

export function PaletteGrid({ children }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, maxHeight: '50vh', overflowY: 'auto' }}>
            {children}
        </div>
    );
}

export function PaletteTile({ label, selected = false, onClick, children }) {
    return (
        <button type="button" aria-pressed={selected} style={tileStyle(selected)} onClick={onClick}>
            {children}
            <Text style={{ fontSize: 12, wordBreak: 'break-word' }}>{label}</Text>
        </button>
    );
}
