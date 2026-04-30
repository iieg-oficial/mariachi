import { Card, Form, Input, InputNumber, Space, Switch, Tabs, Typography } from 'antd';
import StrokeEditor from './StrokeEditor';
import BoundaryLabelTab from './BoundaryLabelTab';

const { Text } = Typography;

function ColorInput({ value, onChange, label }) {
    return (
        <Form.Item label={label} style={{ marginBottom: 0 }}>
            <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => onChange?.(e.target.value.toUpperCase())}
                style={{ width: 60, height: 32, padding: 0, border: '1px solid #d9d9d9', borderRadius: 3 }}
            />
        </Form.Item>
    );
}

function ScaleVisibility({ minScale, maxScale, onChange }) {
    return (
        <Card size="small" title="Visibilidad por escala">
            <Space wrap>
                <Form.Item label="Min scale denominator" style={{ marginBottom: 0 }} extra="Solo visible cuando el zoom es ≥ este valor">
                    <InputNumber value={minScale ?? null} min={0} onChange={(v) => onChange?.({ min_scale: v ?? null, max_scale: maxScale })} style={{ width: 140 }} />
                </Form.Item>
                <Form.Item label="Max scale denominator" style={{ marginBottom: 0 }} extra="Solo visible cuando el zoom es ≤ este valor">
                    <InputNumber value={maxScale ?? null} min={0} onChange={(v) => onChange?.({ min_scale: minScale, max_scale: v ?? null })} style={{ width: 140 }} />
                </Form.Item>
            </Space>
        </Card>
    );
}

function PolygonTab({ value, onChange }) {
    const enabled = !!value;
    const polygon = value || {};
    const stroke = polygon.stroke || null;

    const setEnabled = (en) => {
        if (!en) onChange?.(null);
        else onChange?.({
            fill_color: null,
            fill_opacity: 1.0,
            stroke: { color: '#7A7A7A', width: 1, opacity: 1, linejoin: 'bevel' },
        });
    };
    const update = (patch) => onChange?.({ ...polygon, ...patch });

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space size={6}>
                <Switch checked={enabled} onChange={setEnabled} size="small" />
                <Text>Renderizar polígono</Text>
            </Space>

            {enabled && (
                <>
                    <Card size="small" title="Relleno">
                        <Space size="middle" wrap>
                            <Switch
                                size="small"
                                checked={!!polygon.fill_color}
                                onChange={(en) => update({ fill_color: en ? '#CCCCCC' : null })}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>Activar relleno (sin esto solo borde)</Text>
                        </Space>
                        {polygon.fill_color && (
                            <Space wrap style={{ marginTop: 8 }}>
                                <ColorInput label="Color" value={polygon.fill_color} onChange={(c) => update({ fill_color: c })} />
                                <Form.Item label="Opacidad" style={{ marginBottom: 0 }}>
                                    <InputNumber value={polygon.fill_opacity ?? 1} min={0} max={1} step={0.05} onChange={(v) => update({ fill_opacity: v ?? 1 })} style={{ width: 90 }} />
                                </Form.Item>
                            </Space>
                        )}
                    </Card>

                    <Card size="small" title="Borde">
                        <Space size={6}>
                            <Switch
                                size="small"
                                checked={!!stroke}
                                onChange={(en) => update({
                                    stroke: en
                                        ? { color: '#7A7A7A', width: 1, opacity: 1, linejoin: 'bevel' }
                                        : null,
                                })}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>Activar borde</Text>
                        </Space>
                        {stroke && (
                            <div style={{ marginTop: 8 }}>
                                <StrokeEditor value={stroke} onChange={(s) => update({ stroke: s })} />
                            </div>
                        )}
                    </Card>

                    <ScaleVisibility
                        minScale={polygon.min_scale}
                        maxScale={polygon.max_scale}
                        onChange={({ min_scale, max_scale }) => update({ min_scale, max_scale })}
                    />
                </>
            )}
        </Space>
    );
}

export default function BoundaryEditor({ model, onChange, availableFields }) {
    const update = (patch) => onChange?.({ ...model, ...patch });

    return (
        <Tabs
            defaultActiveKey="polygon"
            items={[
                {
                    key: 'polygon',
                    label: 'Polígono',
                    children: <PolygonTab value={model.polygon} onChange={(polygon) => update({ polygon })} />,
                },
                {
                    key: 'label',
                    label: 'Etiqueta',
                    children: <BoundaryLabelTab value={model.label} onChange={(label) => update({ label })} availableFields={availableFields} />,
                },
                {
                    key: 'metadata',
                    label: 'Metadatos',
                    children: (
                        <Form.Item label="Título del estilo" style={{ marginBottom: 0 }}>
                            <Input
                                value={model.style_title || ''}
                                onChange={(e) => update({ style_title: e.target.value })}
                                style={{ maxWidth: 360 }}
                            />
                        </Form.Item>
                    ),
                },
            ]}
        />
    );
}
