import { Typography, Space, Card, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '@contexts/AuthContext';

const { Title, Paragraph } = Typography;

const roleColors = {
    tetlamamakani: 'red',
    editor: 'blue',
    diseñadora: 'purple',
    viewer: 'green'
};

const roleLabels = {
    tetlamamakani: 'Tetlamamakani',
    editor: 'Editor',
    diseñadora: 'Diseñadora',
    viewer: 'Consulta'
};

export default function Home() {
    const { user } = useAuth();

    return (
        <div>
            <Title level={2}>Bienvenido al CMS Portal</Title>
            <Paragraph style={{ fontSize: '16px', color: '#595959' }}>
                Sistema de Gestión de Contenidos del Instituto de Información Estadística y Geográfica de Jalisco
            </Paragraph>

            {user && (
                <Card style={{ maxWidth: 600, marginTop: 24 }}>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                                Usuario
                            </Paragraph>
                            <Space>
                                <UserOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                                <Paragraph strong style={{ margin: 0, fontSize: 16 }}>
                                    {user.name}
                                </Paragraph>
                            </Space>
                        </div>
                        <div>
                            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                                Email
                            </Paragraph>
                            <Paragraph style={{ margin: 0 }}>
                                {user.email}
                            </Paragraph>
                        </div>
                        <div>
                            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                                Rol
                            </Paragraph>
                            <Tag color={roleColors[user.role]} style={{ fontSize: 14, padding: '4px 12px' }}>
                                {roleLabels[user.role]}
                            </Tag>
                        </div>
                    </Space>
                </Card>
            )}
        </div>
    );
}
