import { Card, Form, Input, InputNumber, Space, Switch, Typography } from 'antd';
import StrokeEditor from './StrokeEditor';

const { Text } = Typography;

export default function NullStyleEditor({ value, onChange }) {
    const enabled = value?.enabled !== false;

    const update = (patch) => {
        onChange?.({
            enabled: true,
            label: 'Sin dato',
            background_color: '#FFFFFF',
            stroke: { color: '#7A7A7A', width: 0.35, opacity: 1.0, linejoin: 'bevel' },
            hatch: { well_known_name: 'shape://times', color: '#7A7A7A', size: 7, stroke_width: 1.0, opacity: 1.0 },
            ...(value || {}),
            ...patch,
        });
    };

    const toggleEnabled = (en) => {
        if (!en) {
            onChange?.({ ...(value || {}), enabled: false });
            return;
        }
        update({ enabled: true });
    };

    return (
        <Card size="small" title={
            <Space>
                <Switch size="small" checked={enabled} onChange={toggleEnabled} />
                <Text>Mostrar regla para valores nulos</Text>
            </Space>
        }>
            {!enabled ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Las features con el atributo en NULL no se renderizarán.
                </Text>
            ) : (
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    <Space wrap>
                        <Form.Item label="Etiqueta de leyenda" style={{ marginBottom: 0 }}>
                            <Input
                                value={value?.label || 'Sin dato'}
                                onChange={(e) => update({ label: e.target.value })}
                                style={{ width: 200 }}
                            />
                        </Form.Item>
                        <Form.Item label="Color de fondo" style={{ marginBottom: 0 }}>
                            <input
                                type="color"
                                value={value?.background_color || '#FFFFFF'}
                                onChange={(e) => update({ background_color: e.target.value.toUpperCase() })}
                                style={{ width: 60, height: 32, padding: 0, border: '1px solid #d9d9d9', borderRadius: 3 }}
                            />
                        </Form.Item>
                    </Space>

                    <StrokeEditor
                        value={value?.stroke || {}}
                        onChange={(s) => update({ stroke: s })}
                        label="Borde"
                    />

                    <Card size="small" type="inner" title="Patrón hatch">
                        <Space wrap>
                            <Form.Item label="Símbolo (well-known)" style={{ marginBottom: 0 }}>
                                <Input
                                    value={value?.hatch?.well_known_name || 'shape://times'}
                                    onChange={(e) => update({ hatch: { ...(value?.hatch || {}), well_known_name: e.target.value } })}
                                    style={{ width: 160 }}
                                />
                            </Form.Item>
                            <Form.Item label="Color" style={{ marginBottom: 0 }}>
                                <input
                                    type="color"
                                    value={value?.hatch?.color || '#7A7A7A'}
                                    onChange={(e) => update({ hatch: { ...(value?.hatch || {}), color: e.target.value.toUpperCase() } })}
                                    style={{ width: 60, height: 32, padding: 0, border: '1px solid #d9d9d9', borderRadius: 3 }}
                                />
                            </Form.Item>
                            <Form.Item label="Tamaño" style={{ marginBottom: 0 }}>
                                <InputNumber
                                    value={value?.hatch?.size ?? 7}
                                    min={1}
                                    onChange={(v) => update({ hatch: { ...(value?.hatch || {}), size: v ?? 7 } })}
                                    style={{ width: 80 }}
                                />
                            </Form.Item>
                            <Form.Item label="Ancho" style={{ marginBottom: 0 }}>
                                <InputNumber
                                    value={value?.hatch?.stroke_width ?? 1.0}
                                    min={0}
                                    step={0.1}
                                    onChange={(v) => update({ hatch: { ...(value?.hatch || {}), stroke_width: v ?? 1 } })}
                                    style={{ width: 80 }}
                                />
                            </Form.Item>
                        </Space>
                    </Card>
                </Space>
            )}
        </Card>
    );
}
