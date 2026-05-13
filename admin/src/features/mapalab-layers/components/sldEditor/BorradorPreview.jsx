import { useEffect, useState } from 'react';
import { Card, Empty, Spin, Typography } from 'antd';
import SymbolPreview from '@features/mapalab-symbols/components/SymbolPreview';
import { listSymbols } from '@features/mapalab-symbols/api/symbolsService';

const { Text } = Typography;


function PointPreview({ point }) {
    const [symbol, setSymbol] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!point?.symbol_id) {
            setSymbol(null);
            setLoading(false);
            return undefined;
        }
        let cancelled = false;
        setLoading(true);
        listSymbols()
            .then((all) => {
                if (cancelled) return;
                setSymbol(all.find((s) => s.id === point.symbol_id) || null);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [point?.symbol_id]);

    if (loading) return <Spin size="small" />;
    if (!symbol) return <Empty description="Sin símbolo asignado" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

    const size = point?.size ?? 16;
    const rotation = point?.rotation ?? 0;
    const opacity = point?.opacity ?? 1;

    return (
        <div style={{ textAlign: 'center', padding: 12 }}>
            <div
                style={{
                    display: 'inline-block',
                    transform: `rotate(${rotation}deg)`,
                    opacity,
                }}
            >
                <SymbolPreview symbol={symbol} size={size * 2} />
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
                {symbol.name || symbol.value || `Símbolo #${symbol.id}`}
                {' · '}{size}px{' · '}{rotation}°{' · op {opacity}'}
            </div>
        </div>
    );
}


function ChoroplethPreview({ model }) {
    const colors = model?.colors || [];
    const labels = model?.labels || [];
    if (!colors.length) return <Empty description="Sin clases" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    return (
        <div style={{ padding: 8 }}>
            {colors.map((color, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                        style={{
                            display: 'inline-block',
                            width: 24,
                            height: 16,
                            background: color,
                            border: '1px solid #d9d9d9',
                            borderRadius: 2,
                        }}
                    />
                    <Text style={{ fontSize: 12 }}>{labels[idx] || `Clase ${idx + 1}`}</Text>
                </div>
            ))}
            {model?.null_style?.enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingTop: 6, borderTop: '1px dashed #eee' }}>
                    <span
                        style={{
                            display: 'inline-block',
                            width: 24,
                            height: 16,
                            background: model.null_style.background_color,
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.3) 3px 4px)',
                            border: '1px solid #d9d9d9',
                            borderRadius: 2,
                        }}
                    />
                    <Text style={{ fontSize: 12 }} type="secondary">{model.null_style.label || 'Sin dato'}</Text>
                </div>
            )}
        </div>
    );
}


function BoundaryPreview({ model }) {
    const polygon = model?.polygon;
    if (!polygon && !model?.label) {
        return <Empty description="Sin polígono ni etiqueta" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
    return (
        <div style={{ padding: 16, textAlign: 'center' }}>
            {polygon && (
                <div
                    style={{
                        display: 'inline-block',
                        width: 80,
                        height: 50,
                        background: polygon.fill_color || 'transparent',
                        opacity: polygon.fill_opacity ?? 1,
                        border: polygon.stroke
                            ? `${polygon.stroke.width || 1}px solid ${polygon.stroke.color || '#000'}`
                            : '1px dashed #ccc',
                        borderRadius: 2,
                    }}
                />
            )}
            {model?.label && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
                    Etiqueta: <code>{model.label.field}</code>
                </div>
            )}
        </div>
    );
}


export default function BorradorPreview({ shape, model }) {
    return (
        <Card size="small" title="Vista previa del borrador">
            {shape === 'point' && <PointPreview point={model?.point} />}
            {shape === 'boundary' && <BoundaryPreview model={model} />}
            {shape === 'choropleth' && <ChoroplethPreview model={model} />}
            {!['point', 'boundary', 'choropleth'].includes(shape) && (
                <Empty description="Vista previa no soportada para este shape" />
            )}
        </Card>
    );
}
