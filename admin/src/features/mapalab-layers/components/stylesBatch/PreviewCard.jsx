import { useEffect, useState } from 'react';
import { Button, Card, Space, Spin, Tag, Typography } from 'antd';
import { fetchPreview } from '@features/mapalab-layers/services/stylesBatchService';

const { Text } = Typography;

const NULL_SWATCH = 'repeating-linear-gradient(45deg, var(--ant-color-text-quaternary) 0 2px, transparent 2px 5px)';

function usePreview(alias, layerName, row) {
    const [src, setSrc] = useState(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let url = null;
        let cancelled = false;
        fetchPreview({ alias, layerName, row })
            .then((objectUrl) => {
                url = objectUrl;
                if (!cancelled) setSrc(objectUrl);
            })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [alias, layerName, row]);
    return { src, failed };
}

function MapImage({ alias, layerName, row, caption }) {
    const { src, failed } = usePreview(alias, layerName, row);
    return (
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            {caption && <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>{caption}</Text>}
            <div style={{ minHeight: 160, display: 'grid', placeItems: 'center' }}>
                {failed && <Text type="secondary">No se pudo pintar la capa</Text>}
                {!failed && !src && <Spin />}
                {src && <img src={src} alt={caption || 'Vista previa'} style={{ maxWidth: '100%', height: 'auto' }} />}
            </div>
        </Space>
    );
}

function Legend({ row }) {
    return (
        <Space orientation="vertical" size={4} style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
            <Text strong style={{ fontSize: 12 }}>{row.unidades || row.nombre}</Text>
            {row.labels.map((label, index) => (
                <Space key={label} size={6}>
                    <i style={{ display: 'block', width: 14, height: 14, borderRadius: 3, background: row.colores[index] }} />
                    <Text style={{ fontSize: 12 }}>{label}</Text>
                </Space>
            ))}
            <Space size={6}>
                <i style={{ display: 'block', width: 14, height: 14, borderRadius: 3, background: NULL_SWATCH }} />
                <Text style={{ fontSize: 12 }}>Sin dato</Text>
            </Space>
        </Space>
    );
}

export default function PreviewCard({ row }) {
    const [comparing, setComparing] = useState(false);
    const extra = row.reemplaza
        ? (
            <Button size="small" shape="round" aria-pressed={comparing} onClick={() => setComparing((v) => !v)}>
                {comparing ? 'Ocultar el actual' : 'Reemplaza · Comparar'}
            </Button>
        )
        : <Tag color="success">Nuevo</Tag>;

    const body = (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'start' }}>
            <MapImage alias={row.alias} layerName={row.layer_name} row={row} caption={comparing ? 'Nuevo' : null} />
            <Legend row={row} />
        </div>
    );

    return (
        <Card size="small" title={row.nombre} extra={extra} style={comparing ? { gridColumn: '1 / -1' } : undefined}>
            {comparing
                ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        <MapImage alias={row.alias} layerName={row.layer_name} row={null} caption="Hoy en el visor" />
                        {body}
                    </div>
                )
                : body}
        </Card>
    );
}
