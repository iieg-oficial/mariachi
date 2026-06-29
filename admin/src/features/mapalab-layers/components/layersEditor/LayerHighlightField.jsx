import { useRef } from 'react';
import { ColorPicker, Form, Radio, Switch, Typography } from 'antd';
import { HIGHLIGHT_COLORS, HIGHLIGHT_SHAPES, isHexHighlight, resolveColorEntry } from './highlightConstants';
import { HighlightSwatch } from './highlightShared';

const { Text } = Typography;

const ColorChoice = ({ value, onChange, currentShape }) => {
    const isCustomValue = isHexHighlight(value);
    const selectedKey = isCustomValue ? '__custom__' : (value === undefined ? null : value);
    const handleRadio = (e) => {
        const next = e.target.value;
        if (next === '__custom__') {
            onChange?.(isCustomValue ? value : '#5C2472');
            return;
        }
        onChange?.(next);
    };
    return (
        <Radio.Group
            value={selectedKey}
            onChange={handleRadio}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
            {HIGHLIGHT_COLORS.map((opt) => {
                const isCustomRow = opt.value === '__custom__';
                const swatchStroke = isCustomRow && isCustomValue ? value : opt.stroke;
                const swatchFill = isCustomRow && isCustomValue ? `${value}2D` : opt.fill;
                return (
                    <Radio key={String(opt.value)} value={opt.value}>
                        <HighlightSwatch stroke={swatchStroke} fill={swatchFill} shape={currentShape || 'area'} />
                        <Text>{opt.label}</Text>
                        {isCustomRow && selectedKey === '__custom__' && (
                            <ColorPicker
                                value={isCustomValue ? value : '#5C2472'}
                                onChange={(c) => onChange?.(c.toHexString().toUpperCase())}
                                size="small"
                                style={{ marginLeft: 8 }}
                            />
                        )}
                    </Radio>
                );
            })}
        </Radio.Group>
    );
};

const ShapeChoice = ({ value, onChange, currentColor }) => {
    const entry = resolveColorEntry(currentColor);
    return (
        <Radio.Group
            value={value === undefined ? null : value}
            onChange={(e) => onChange?.(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
            {HIGHLIGHT_SHAPES.filter((opt) => opt.value !== 'off').map((opt) => (
                <Radio key={String(opt.value)} value={opt.value}>
                    <HighlightSwatch stroke={entry.stroke} fill={entry.fill} shape={opt.preview} />
                    <Text>{opt.label}</Text>
                </Radio>
            ))}
        </Radio.Group>
    );
};

export default function LayerHighlightField({ colorName = 'highlightColor', shapeName = 'highlightShape' }) {
    const form = Form.useFormInstance();
    const colorValue = Form.useWatch(colorName, form);
    const shapeValue = Form.useWatch(shapeName, form);
    const enabled = shapeValue !== 'off';
    const lastShapeRef = useRef(null);

    const handleToggle = (checked) => {
        if (checked) {
            form.setFieldValue(shapeName, lastShapeRef.current ?? null);
        } else {
            lastShapeRef.current = shapeValue ?? null;
            form.setFieldValue(shapeName, 'off');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: enabled ? 16 : 0 }}>
                <Switch checked={enabled} onChange={handleToggle} />
                <Text strong>Activar resaltado</Text>
            </div>
            {!enabled && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Esta capa no se resaltará al hacer clic en sus features.
                </Text>
            )}
            <div style={{ display: enabled ? 'flex' : 'none', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Color</Text>
                    <Form.Item name={colorName} noStyle valuePropName="value" trigger="onChange">
                        <ColorChoice currentShape={shapeValue} />
                    </Form.Item>
                </div>
                <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Forma</Text>
                    <Form.Item name={shapeName} noStyle valuePropName="value" trigger="onChange">
                        <ShapeChoice currentColor={colorValue} />
                    </Form.Item>
                </div>
            </div>
        </div>
    );
}
