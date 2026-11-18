import { Button, Card, Popconfirm, Space, Tag, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import ColorRamp from '@features/sextante/components/stylesBatch/ColorRamp';

const { Text } = Typography;

const SHAPES = { point: 'Punto', boundary: 'Límite', xml: 'XML', choropleth: 'Coroplético' };
const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 16 };
const RAMP_BOX = { height: 18, display: 'flex', alignItems: 'center' };

const when = (date) => new Date(date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

function SldCard({ item, onReview, onApprove, onReject, approving }) {
    const data = item.data || {};
    const shape = data.shape || 'choropleth';
    const colors = data.colors || [];
    const styleName = data.style_title || data.style_name || item.resource_id.split(':').slice(1).join(':');
    return (
        <Card size="small" styles={{ body: { display: 'grid', gap: 8 } }}>
            <div style={RAMP_BOX}>
                {colors.length ? <ColorRamp colors={colors} size={18} stretch /> : <Tag>{SHAPES[shape] || shape}</Tag>}
            </div>
            <Text strong ellipsis={{ tooltip: styleName }}>{styleName}</Text>
            <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }} ellipsis={{ tooltip: item.resource_id }}>
                {item.resource_id}
            </Text>
            <Space size={4} wrap>
                <Tag color="green">{SHAPES[shape] || shape}</Tag>
                <Tag>{data.layer_id ? 'Capa' : 'Lote'}</Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>{item.usuario?.name || '—'} · {when(item.actualizado_en)}</Text>
            <Space size={6} wrap>
                <Button shape="round" icon={<EyeOutlined />} onClick={() => onReview(item)}>Revisar</Button>
                <Popconfirm title="¿Aprobar y publicar en el visor?" okText="Aprobar" cancelText="Cancelar" onConfirm={() => onApprove(item)}>
                    <Button shape="round" type="primary" icon={<CheckOutlined />} loading={approving}>Aprobar</Button>
                </Popconfirm>
                <Button shape="round" danger icon={<CloseOutlined />} aria-label="Rechazar" onClick={() => onReject(item)} />
            </Space>
        </Card>
    );
}

export default function SldReviewCards({ items, onReview, onApprove, onReject, approving }) {
    if (!items.length) return null;
    return (
        <section aria-label="Simbología pendiente">
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Simbología ({items.length})</Text>
            <div style={GRID_STYLE}>
                {items.map((item) => (
                    <SldCard
                        key={item.id}
                        item={item}
                        onReview={onReview}
                        onApprove={onApprove}
                        onReject={onReject}
                        approving={approving}
                    />
                ))}
            </div>
        </section>
    );
}
