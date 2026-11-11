import { useState } from 'react';
import { Button, ColorPicker, Space } from 'antd';
import ColorRamp from './ColorRamp';

const FALLBACK = '#CCCCCC';

const initialColors = (row, classes) => Array.from(
    { length: classes },
    (_, index) => row?.colores?.[index] || FALLBACK,
);

export default function CustomRamp({ row, classes, onPick }) {
    const [colors, setColors] = useState(() => initialColors(row, classes));

    const setColor = (index, hex) => setColors((prev) => prev.map((c, i) => (i === index ? hex : c)));

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <ColorRamp colors={colors} size={22} stretch />
            <Space wrap>
                {colors.map((color, index) => (
                    <ColorPicker
                        key={index}
                        value={color}
                        disabledAlpha
                        onChangeComplete={(value) => setColor(index, value.toHexString().toUpperCase())}
                        aria-label={`Color de la clase ${index + 1}`}
                    />
                ))}
            </Space>
            <Button type="primary" shape="round" disabled={!classes} onClick={() => onPick({ colores_propios: colors.join(' ') })}>
                Usar estos colores
            </Button>
        </Space>
    );
}
