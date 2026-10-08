import { Alert } from 'antd';
import { TeamOutlined } from '@ant-design/icons';

export default function PresenciaIndicator({ editores }) {
    if (!editores || editores.length === 0) return null;
    const nombres = editores.map((e) => e.name || e.username).join(', ');
    const verbo = editores.length === 1 ? 'también está editando' : 'también están editando';
    return (
        <Alert closable
            type="warning"
            showIcon
            icon={<TeamOutlined />}
            title={`${nombres} ${verbo} esto`}
        />
    );
}
