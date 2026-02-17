import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { useAuth } from '@contexts/AuthContext';

const { Title, Paragraph } = Typography;

export default function Login() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const data = await login(values.username, values.password);
            message.success('¡Inicio de sesión exitoso!');

            if (data.user.must_change_password) {
                navigate('/change-password');
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error(error);
            const errorMessage = error.response?.data?.detail || 'Error al iniciar sesión';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <Card
                style={{
                    width: '100%',
                    maxWidth: 450,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                }}
            >
                <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                        <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                            CMS Portal
                        </Title>
                        <Paragraph style={{ color: '#8c8c8c', marginTop: 8 }}>
                            Instituto de Información Estadística y Geográfica de Jalisco
                        </Paragraph>
                    </div>

                    {import.meta.env.DEV && (
                        <Alert
                            title="Modo de Desarrollo"
                            description={
                                <div>
                                    <p style={{ margin: '8px 0' }}><strong>Usuarios de prueba:</strong></p>
                                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                                        <li>admin / admin123 (Tetlamamakani)</li>
                                        <li>editor / editor123 (Editora)</li>
                                    </ul>
                                </div>
                            }
                            type="info"
                            icon={<InfoCircleOutlined />}
                            showIcon
                        />
                    )}

                    <Form
                        name="login"
                        onFinish={onFinish}
                        autoComplete="off"
                        layout="vertical"
                        initialValues={
                            import.meta.env.DEV ? { username: 'admin' } : {}
                        }
                    >
                        <Form.Item
                            label="Usuario"
                            name="username"
                            rules={[
                                {
                                    required: true,
                                    message: 'Por favor ingrese su usuario',
                                },
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="Ingrese su usuario"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Contraseña"
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Por favor ingrese su contraseña',
                                },
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Ingrese su contraseña"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                size="large"
                                block
                            >
                                Iniciar Sesión
                            </Button>
                        </Form.Item>
                    </Form>
                </Space>
            </Card>
        </div>
    );
}
