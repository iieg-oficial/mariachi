import { Form, InputNumber, Select, Space } from 'antd';

const LINEJOINS = [
    { value: 'bevel', label: 'bevel' },
    { value: 'miter', label: 'miter' },
    { value: 'round', label: 'round' },
];

export default function StrokeEditor({ value = {}, onChange, label = 'Borde' }) {
    const update = (patch) => onChange?.({ ...value, ...patch });

    return (
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Space wrap>
                <Form.Item label={`${label} - Color`} style={{ marginBottom: 0 }}>
                    <input
                        type="color"
                        value={value.color || '#FFFFFF'}
                        onChange={(e) => update({ color: e.target.value.toUpperCase() })}
                        style={{ width: 60, height: 32, padding: 0, border: '1px solid #d9d9d9', borderRadius: 3 }}
                    />
                </Form.Item>
                <Form.Item label="Ancho" style={{ marginBottom: 0 }}>
                    <InputNumber
                        value={value.width ?? 0.35}
                        min={0}
                        step={0.05}
                        onChange={(v) => update({ width: v ?? 0 })}
                        style={{ width: 90 }}
                    />
                </Form.Item>
                <Form.Item label="Opacidad" style={{ marginBottom: 0 }}>
                    <InputNumber
                        value={value.opacity ?? 1.0}
                        min={0}
                        max={1}
                        step={0.05}
                        onChange={(v) => update({ opacity: v ?? 1 })}
                        style={{ width: 90 }}
                    />
                </Form.Item>
                <Form.Item label="Linejoin" style={{ marginBottom: 0 }}>
                    <Select
                        value={value.linejoin || 'bevel'}
                        onChange={(v) => update({ linejoin: v })}
                        options={LINEJOINS}
                        style={{ width: 110 }}
                    />
                </Form.Item>
            </Space>
        </Space>
    );
}
