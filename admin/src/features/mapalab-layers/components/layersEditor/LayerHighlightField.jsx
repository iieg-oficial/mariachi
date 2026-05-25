import { Form, Radio, Typography } from 'antd';

const { Text } = Typography;

const COLORS = [
    { value: null, label: 'Morado (default)', stroke: '#5C2472', fill: 'rgba(92, 36, 114, 0.18)' },
    { value: 'naranja', label: 'Naranja institucional', stroke: '#FF8300', fill: 'rgba(255, 131, 0, 0.18)' },
    { value: 'sombreado', label: 'Sombreado discreto', stroke: 'rgba(46, 67, 114, 0.55)', fill: 'rgba(46, 67, 114, 0.18)' },
];

const SHAPES = [
    { value: null, label: 'Área + línea', preview: 'area' },
    { value: 'linea', label: 'Solo línea', preview: 'linea' },
    { value: 'off', label: 'Sin resaltar', preview: 'off' },
];

const Swatch = ({ stroke, fill, shape = 'area' }) => {
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

const ColorPicker = ({ value, onChange, currentShape }) => (
    <Radio.Group
        value={value === undefined ? null : value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
        {COLORS.map((opt) => (
            <Radio key={String(opt.value)} value={opt.value}>
                <Swatch stroke={opt.stroke} fill={opt.fill} shape={currentShape || 'area'} />
                <Text>{opt.label}</Text>
            </Radio>
        ))}
    </Radio.Group>
);

const ShapePicker = ({ value, onChange, currentColor }) => {
    const colorEntry = COLORS.find((c) => c.value === (currentColor ?? null)) || COLORS[0];
    return (
        <Radio.Group
            value={value === undefined ? null : value}
            onChange={(e) => onChange?.(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
            {SHAPES.map((opt) => (
                <Radio key={String(opt.value)} value={opt.value}>
                    <Swatch stroke={colorEntry.stroke} fill={colorEntry.fill} shape={opt.preview} />
                    <Text>{opt.label}</Text>
                </Radio>
            ))}
        </Radio.Group>
    );
};

export default function LayerHighlightField({ colorName = 'highlightColor', shapeName = 'highlightShape' }) {
    const colorValue = Form.useWatch(colorName);
    const shapeValue = Form.useWatch(shapeName);
    return (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Color</Text>
                <Form.Item name={colorName} noStyle valuePropName="value" trigger="onChange">
                    <ColorPicker currentShape={shapeValue} />
                </Form.Item>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Forma</Text>
                <Form.Item name={shapeName} noStyle valuePropName="value" trigger="onChange">
                    <ShapePicker currentColor={colorValue} />
                </Form.Item>
            </div>
        </div>
    );
}
