import { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Slider, Space, Switch, Tabs, Typography } from 'antd';
import BoundaryLabelTab from './BoundaryLabelTab';
import SymbolPicker from './SymbolPicker';
import SymbolPreview from '@features/mapalab-symbols/components/SymbolPreview';
import { listSymbols } from '@features/mapalab-symbols/api/symbolsService';

const { Text } = Typography;


function SymbolTab({ value, onChange }) {
    const enabled = !!value;
    const symbol = value || {};
    const [selectedSymbolMeta, setSelectedSymbolMeta] = useState(null);

    useEffect(() => {
        if (!symbol.symbol_id) {
            setSelectedSymbolMeta(null);
            return undefined;
        }
        let cancelled = false;
        listSymbols()
            .then((all) => {
                if (cancelled) return;
                setSelectedSymbolMeta(all.find((s) => s.id === symbol.symbol_id) || null);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [symbol.symbol_id]);

    const setEnabled = (en) => {
        if (!en) onChange?.(null);
        else onChange?.({ symbol_id: null, size: 16, rotation: 0, opacity: 1.0 });
    };
    const update = (patch) => onChange?.({ ...symbol, ...patch });

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space size={6}>
                <Switch checked={enabled} onChange={setEnabled} size="small" />
                <Text>Renderizar símbolo de punto</Text>
            </Space>

            {enabled && (
                <>
                    <Card size="small" title="Símbolo">
                        <SymbolPicker
                            value={symbol.symbol_id}
                            onChange={(symbolId) => update({ symbol_id: symbolId })}
                        />
                        {selectedSymbolMeta && (
                            <div
                                style={{
                                    marginTop: 10,
                                    padding: 8,
                                    background: '#fff7e6',
                                    border: '1px solid #ffe7ba',
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <SymbolPreview symbol={selectedSymbolMeta} size={32} />
                                <Text style={{ fontSize: 12 }}>
                                    {selectedSymbolMeta.name || selectedSymbolMeta.value || `Símbolo #${selectedSymbolMeta.id}`}
                                </Text>
                            </div>
                        )}
                    </Card>

                    <Card size="small" title="Apariencia">
                        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                            <Form.Item label={`Tamaño (px): ${symbol.size ?? 16}`} style={{ marginBottom: 0 }}>
                                <Slider
                                    min={4}
                                    max={128}
                                    step={1}
                                    value={symbol.size ?? 16}
                                    onChange={(v) => update({ size: v })}
                                />
                            </Form.Item>
                            <Form.Item label={`Rotación (°): ${symbol.rotation ?? 0}`} style={{ marginBottom: 0 }}>
                                <Slider
                                    min={0}
                                    max={360}
                                    step={1}
                                    value={symbol.rotation ?? 0}
                                    onChange={(v) => update({ rotation: v })}
                                />
                            </Form.Item>
                            <Form.Item label="Opacidad" style={{ marginBottom: 0 }}>
                                <InputNumber
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={symbol.opacity ?? 1.0}
                                    onChange={(v) => update({ opacity: v ?? 1.0 })}
                                    style={{ width: 100 }}
                                />
                            </Form.Item>
                        </Space>
                    </Card>
                </>
            )}
        </Space>
    );
}


export default function PointEditor({ model, onChange, availableFields }) {
    const update = (patch) => onChange?.({ ...model, ...patch });

    return (
        <Tabs
            defaultActiveKey="symbol"
            items={[
                {
                    key: 'symbol',
                    label: 'Símbolo',
                    children: <SymbolTab value={model.point} onChange={(point) => update({ point })} />,
                },
                {
                    key: 'label',
                    label: 'Etiqueta',
                    children: (
                        <BoundaryLabelTab
                            value={model.label}
                            onChange={(label) => update({ label })}
                            availableFields={availableFields}
                        />
                    ),
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
