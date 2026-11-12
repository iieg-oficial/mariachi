import { Button, Card, Space, Spin, Tag, Typography } from 'antd';
import useStylePreview from '@features/sextante/hooks/useStylePreview';

const { Text } = Typography;

const NULL_SWATCH = 'repeating-linear-gradient(45deg, var(--ant-color-text-quaternary) 0 2px, transparent 2px 5px)';

export function MapImage({ alias, layerName, row, caption }) {
    const { src, failed, retry } = useStylePreview(alias, layerName, row);
    return (
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            {caption && <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>{caption}</Text>}
            <div style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
                {failed && (
                    <Space orientation="vertical" align="center" size={4}>
                        <Text type="secondary">No se pudo pintar la capa</Text>
                        <Button size="small" shape="round" onClick={retry}>Reintentar</Button>
                    </Space>
                )}
                {!failed && !src && <Spin />}
                {src && <img src={src} alt={caption || 'Vista previa'} style={{ maxWidth: '100%', height: 'auto' }} />}
            </div>
        </Space>
    );
}

export function Legend({ row }) {
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

export function PreviewPanel({ row }) {
    const body = (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'start' }}>
            <MapImage alias={row.alias} layerName={row.layer_name} row={row} caption={row.reemplaza ? 'Nuevo' : null} />
            <Legend row={row} />
        </div>
    );
    return (
        <Card
            size="small"
            title={row.nombre}
            extra={row.reemplaza ? <Tag color="warning">Reemplaza</Tag> : <Tag color="success">Nuevo</Tag>}
        >
            {row.reemplaza
                ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                        <MapImage alias={row.alias} layerName={row.layer_name} row={null} caption="Hoy en el visor" />
                        {body}
                    </div>
                )
                : body}
        </Card>
    );
}
