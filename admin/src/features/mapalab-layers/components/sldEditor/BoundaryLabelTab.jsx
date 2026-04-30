import { Card, Form, Input, InputNumber, Select, Space, Switch, Typography } from 'antd';

const { Text } = Typography;

const FONT_WEIGHTS = [
    { value: 'normal', label: 'normal' },
    { value: 'bold', label: 'bold' },
];

const FONT_STYLES = [
    { value: 'normal', label: 'normal' },
    { value: 'italic', label: 'italic' },
];

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
                    <InputNumber
                        value={minScale ?? null}
                        min={0}
                        onChange={(v) => onChange?.({ min_scale: v ?? null, max_scale: maxScale })}
                        style={{ width: 140 }}
                    />
                </Form.Item>
                <Form.Item label="Max scale denominator" style={{ marginBottom: 0 }} extra="Solo visible cuando el zoom es ≤ este valor">
                    <InputNumber
                        value={maxScale ?? null}
                        min={0}
                        onChange={(v) => onChange?.({ min_scale: minScale, max_scale: v ?? null })}
                        style={{ width: 140 }}
                    />
                </Form.Item>
            </Space>
        </Card>
    );
}

export default function BoundaryLabelTab({ value, onChange, availableFields }) {
    const enabled = !!value;
    const label = value || {};

    const setEnabled = (en) => {
        if (!en) onChange?.(null);
        else onChange?.({
            field: '',
            font: { family: 'Arial', size: 11, style: 'normal', weight: 'normal' },
            fill_color: '#000000',
            placement: { anchor_x: 0.5, anchor_y: 0.5 },
            vendor_options: {},
        });
    };
    const update = (patch) => onChange?.({ ...label, ...patch });
    const updateFont = (patch) => update({ font: { ...(label.font || {}), ...patch } });
    const updatePlacement = (patch) => update({ placement: { ...(label.placement || {}), ...patch } });
    const updateHalo = (patch) => update({ halo: { ...(label.halo || { radius: 2, color: '#FFFFFF' }), ...patch } });
    const toggleHalo = (en) => update({ halo: en ? { radius: 2, color: '#FFFFFF' } : null });
    const updateVendorOption = (name, val) => {
        const opts = { ...(label.vendor_options || {}) };
        if (val === '' || val === null || val === undefined) {
            delete opts[name];
        } else {
            opts[name] = String(val);
        }
        update({ vendor_options: opts });
    };

    const fieldOptions = (availableFields || []).map((f) => ({ value: f.name, label: f.name }));

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space size={6}>
                <Switch checked={enabled} onChange={setEnabled} size="small" />
                <Text>Mostrar etiqueta de texto</Text>
            </Space>

            {enabled && (
                <>
                    <Form.Item label="Campo del feature a usar como etiqueta">
                        <Select
                            value={label.field || undefined}
                            onChange={(v) => update({ field: v })}
                            options={fieldOptions}
                            placeholder="Selecciona un campo"
                            showSearch
                            allowClear
                            style={{ maxWidth: 320 }}
                        />
                    </Form.Item>

                    <Card size="small" title="Tipografía">
                        <Space wrap>
                            <Form.Item label="Familia" style={{ marginBottom: 0 }}>
                                <Input value={label.font?.family || 'Arial'} onChange={(e) => updateFont({ family: e.target.value })} style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item label="Tamaño" style={{ marginBottom: 0 }}>
                                <InputNumber value={label.font?.size ?? 11} min={1} onChange={(v) => updateFont({ size: v ?? 11 })} style={{ width: 80 }} />
                            </Form.Item>
                            <Form.Item label="Estilo" style={{ marginBottom: 0 }}>
                                <Select value={label.font?.style || 'normal'} onChange={(v) => updateFont({ style: v })} options={FONT_STYLES} style={{ width: 100 }} />
                            </Form.Item>
                            <Form.Item label="Peso" style={{ marginBottom: 0 }}>
                                <Select value={label.font?.weight || 'normal'} onChange={(v) => updateFont({ weight: v })} options={FONT_WEIGHTS} style={{ width: 100 }} />
                            </Form.Item>
                            <ColorInput label="Color de texto" value={label.fill_color || '#000000'} onChange={(c) => update({ fill_color: c })} />
                        </Space>
                    </Card>

                    <Card size="small" title="Halo (contorno del texto)">
                        <Space size={6}>
                            <Switch size="small" checked={!!label.halo} onChange={toggleHalo} />
                            <Text type="secondary" style={{ fontSize: 12 }}>Activar halo</Text>
                        </Space>
                        {label.halo && (
                            <Space wrap style={{ marginTop: 8 }}>
                                <Form.Item label="Radio" style={{ marginBottom: 0 }}>
                                    <InputNumber value={label.halo.radius ?? 2} min={0} step={0.5} onChange={(v) => updateHalo({ radius: v ?? 2 })} style={{ width: 80 }} />
                                </Form.Item>
                                <ColorInput label="Color" value={label.halo.color || '#FFFFFF'} onChange={(c) => updateHalo({ color: c })} />
                            </Space>
                        )}
                    </Card>

                    <Card size="small" title="Posicionamiento">
                        <Space wrap>
                            <Form.Item label="Anchor X" style={{ marginBottom: 0 }}>
                                <InputNumber value={label.placement?.anchor_x ?? 0.5} min={0} max={1} step={0.1} onChange={(v) => updatePlacement({ anchor_x: v ?? 0.5 })} style={{ width: 90 }} />
                            </Form.Item>
                            <Form.Item label="Anchor Y" style={{ marginBottom: 0 }}>
                                <InputNumber value={label.placement?.anchor_y ?? 0.5} min={0} max={1} step={0.1} onChange={(v) => updatePlacement({ anchor_y: v ?? 0.5 })} style={{ width: 90 }} />
                            </Form.Item>
                        </Space>
                    </Card>

                    <Card size="small" title="Geometría (opcional)">
                        <Space wrap>
                            <Form.Item label="Función" style={{ marginBottom: 0 }} extra="ej. interiorPoint">
                                <Input value={label.geometry_function || ''} onChange={(e) => update({ geometry_function: e.target.value || null })} style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item label="Propiedad" style={{ marginBottom: 0 }} extra="ej. geom">
                                <Input value={label.geometry_property || ''} onChange={(e) => update({ geometry_property: e.target.value || null })} style={{ width: 160 }} />
                            </Form.Item>
                        </Space>
                    </Card>

                    <Card size="small" title="Vendor options (avanzado)">
                        <Space wrap>
                            <Form.Item label="group" style={{ marginBottom: 0 }}>
                                <Select
                                    value={label.vendor_options?.group || ''}
                                    onChange={(v) => updateVendorOption('group', v)}
                                    options={[
                                        { value: '', label: '(default)' },
                                        { value: 'true', label: 'true' },
                                        { value: 'false', label: 'false' },
                                    ]}
                                    style={{ width: 110 }}
                                    allowClear
                                />
                            </Form.Item>
                            <Form.Item label="spaceAround" style={{ marginBottom: 0 }}>
                                <InputNumber value={label.vendor_options?.spaceAround ? Number(label.vendor_options.spaceAround) : null} onChange={(v) => updateVendorOption('spaceAround', v)} style={{ width: 110 }} />
                            </Form.Item>
                            <Form.Item label="maxDisplacement" style={{ marginBottom: 0 }}>
                                <InputNumber value={label.vendor_options?.maxDisplacement ? Number(label.vendor_options.maxDisplacement) : null} onChange={(v) => updateVendorOption('maxDisplacement', v)} style={{ width: 130 }} />
                            </Form.Item>
                        </Space>
                    </Card>

                    <ScaleVisibility
                        minScale={label.min_scale}
                        maxScale={label.max_scale}
                        onChange={({ min_scale, max_scale }) => update({ min_scale, max_scale })}
                    />
                </>
            )}
        </Space>
    );
}
