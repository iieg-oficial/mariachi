import { Space, Tag, Tooltip, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const { Text } = Typography;

const SHAPE_LABELS = {
    choropleth: { label: 'Coroplético', color: 'purple' },
    boundary: { label: 'Límite / relleno único', color: 'blue' },
    point: { label: 'Punto', color: 'green' },
};

const NOWRAP = { whiteSpace: 'nowrap' };
const none = <Text type="secondary">—</Text>;

export function ShapeTag({ summary }) {
    const shape = SHAPE_LABELS[summary.shape] || { label: 'No reconocido' };
    if (summary.editable) return <Tag color={shape.color}>{shape.label}</Tag>;
    return (
        <Tooltip title={summary.reason || 'No se puede editar con el editor de colores'}>
            <Tag color={shape.color} icon={<LockOutlined />}>{shape.label}</Tag>
        </Tooltip>
    );
}

export function LayerTags({ layers }) {
    if (!layers.length) return none;
    const [first, ...rest] = layers;
    const shared = layers.length > 1 ? `Lo comparten ${layers.length} capas: editarlo las cambia a todas.` : first;
    return (
        <Tooltip title={<>{shared}{rest.length > 0 && <div>{rest.join(', ')}</div>}</>}>
            <Space size={4} style={NOWRAP}>
                <Tag style={{ marginInlineEnd: 0 }}>{first}</Tag>
                {rest.length > 0 && <Tag color="orange" style={{ marginInlineEnd: 0 }}>+{rest.length}</Tag>}
            </Space>
        </Tooltip>
    );
}
