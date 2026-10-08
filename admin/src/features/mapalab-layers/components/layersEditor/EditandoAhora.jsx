import { Space, Tag, Typography } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import usePresencia from '@shared/hooks/usePresencia';

const { Text } = Typography;

export default function EditandoAhora({ layerId }) {
    const editores = usePresencia(layerId ? `/borradores/layer/${encodeURIComponent(layerId)}` : null, Boolean(layerId));
    if (!editores.length) return null;
    const nombres = editores.map((e) => e.name || e.username).join(', ');
    return (
        <Space size={4}>
            <Tag bordered={false} color="blue" icon={<TeamOutlined />}>{nombres}</Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>
                {editores.length === 1 ? 'también está en esta capa' : 'también están en esta capa'}
            </Text>
        </Space>
    );
}
