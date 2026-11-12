import { Space, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function PageHeader({ title, tip, actions, before }) {
    return (
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            {before}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Space size={8} align="center">
                    <Title level={3} style={{ margin: 0 }}>{title}</Title>
                    {tip && <Tooltip title={tip}><InfoCircleOutlined aria-label={tip} /></Tooltip>}
                </Space>
                <Space wrap>{actions}</Space>
            </div>
        </Space>
    );
}
