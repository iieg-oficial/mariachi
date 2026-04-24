import { useState } from 'react';
import { Form, Input, Button, Typography, message, Alert, Flex, theme } from 'antd';
import { UserOutlined, LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { useAuth } from '@shared/contexts/AuthContext';
import useIsMobile from '@shared/hooks/useIsMobile';
import { BRAND } from '@app/providers/MainProvider';

const { Title, Text } = Typography;
const { useToken } = theme;

export default function Login() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();
    const { token } = useToken();
    const { isMobile } = useIsMobile();

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
        <Flex
            align="center"
            justify="center"
            style={{
                minHeight: '100vh',
                padding: isMobile ? token.paddingLG : token.paddingXL,
                background: token.colorBgLayout
            }}
        >
            <Flex
                vertical
                gap={token.marginXL}
                style={{
                    width: '100%',
                    maxWidth: 360,
                    background: token.colorBgContainer,
                    padding: isMobile ? token.paddingLG : token.paddingXL,
                    borderRadius: token.borderRadiusLG,
                    border: isMobile ? 'none' : `1px solid ${token.colorBorderSecondary}`
                }}
            >
                <Flex vertical gap={token.marginXXS}>
                    <div
                        aria-hidden
                        style={{
                            width: 40,
                            height: 4,
                            borderRadius: 2,
                            background: `linear-gradient(90deg, ${BRAND.numeralia}, ${BRAND.purple}, ${BRAND.orange})`,
                            marginBottom: token.marginSM
                        }}
                    />
                    <Title level={3} style={{ margin: 0, fontWeight: 500 }}>
                        Mariachi
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        Panel de administración del Instituto de Información Estadística y Geográfica de Jalisco
                    </Text>
                </Flex>

                {import.meta.env.DEV && (
                    <Alert
                        type="info"
                        icon={<InfoCircleOutlined />}
                        showIcon
                        style={{ background: token.colorFillQuaternary, border: 'none' }}
                        title={<Text strong style={{ fontSize: 13 }}>Dev</Text>}
                        description={
                            <Flex vertical gap={2}>
                                <Text style={{ fontSize: 12 }}>admin / admin123</Text>
                                <Text style={{ fontSize: 12 }}>editor / editor123</Text>
                            </Flex>
                        }
                    />
                )}

                <Form
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                    requiredMark={false}
                    initialValues={
                        import.meta.env.DEV ? { username: 'admin' } : {}
                    }
                >
                    <Form.Item
                        label="Usuario"
                        name="username"
                        rules={[{ required: true, message: 'Ingrese su usuario' }]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: token.colorTextTertiary }} />}
                            placeholder="usuario"
                            size="large"
                            variant="filled"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Contraseña"
                        name="password"
                        rules={[{ required: true, message: 'Ingrese su contraseña' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: token.colorTextTertiary }} />}
                            placeholder="••••••••"
                            size="large"
                            variant="filled"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: token.marginLG }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            size="large"
                            block
                        >
                            Entrar
                        </Button>
                    </Form.Item>
                </Form>
            </Flex>
        </Flex>
    );
}
