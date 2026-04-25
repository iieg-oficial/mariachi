import { useState } from 'react';
import { Form, Input, Button, Typography, message, Flex, Row, Col, theme } from 'antd';
import { useNavigate } from 'react-router';
import { useAuth } from '@shared/contexts/useAuth';
import useIsMobile from '@shared/hooks/useIsMobile';
import { BRAND } from '@app/providers/brand';

const { Title, Text, Link: TypoLink } = Typography;
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

            if (data.user.role === 'externo') {
                message.info('Cuenta externa. Te llevamos a SIEEJ.');
                window.location.href = '/sieej/inicio-sesion';
                return;
            }

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
            vertical
            align="center"
            justify="center"
            style={{
                minHeight: '100dvh',
                boxSizing: 'border-box',
                padding: isMobile ? token.paddingLG : token.paddingXL,
                background: `url(${import.meta.env.BASE_URL}login-background.svg) center / cover no-repeat`,
                overscrollBehavior: 'none',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 1088,
                    background: token.colorBgContainer,
                    borderRadius: 16,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    padding: isMobile ? token.paddingLG : 40,
                }}
            >
                <Row gutter={isMobile ? 0 : 40} align="middle">
                    <Col xs={24} md={12}>
                        <Flex vertical justify="center" style={{ minHeight: isMobile ? 'auto' : 380 }}>
                            <Flex vertical gap={token.marginXS} style={{ marginBottom: token.marginXL }}>
                                <Title level={2} style={{ margin: 0, color: BRAND.purple, fontWeight: 700 }}>
                                    Hola
                                </Title>
                                <Text type="secondary" style={{ fontSize: 14 }}>
                                    Ingresa tus datos para iniciar sesión.
                                </Text>
                            </Flex>

                            <Form
                                name="login"
                                onFinish={onFinish}
                                autoComplete="off"
                                layout="vertical"
                                requiredMark={false}
                                initialValues={import.meta.env.DEV ? { username: 'admin' } : {}}
                            >
                                <Form.Item
                                    label="Usuario o correo electrónico"
                                    name="username"
                                    rules={[{ required: true, message: 'Ingrese su usuario' }]}
                                >
                                    <Input placeholder="usuario" size="large" variant="filled" />
                                </Form.Item>

                                <Form.Item
                                    label="Contraseña"
                                    name="password"
                                    rules={[{ required: true, message: 'Ingrese su contraseña' }]}
                                >
                                    <Input.Password placeholder="••••••••" size="large" variant="filled" />
                                </Form.Item>

                                <Form.Item style={{ marginTop: token.marginLG, marginBottom: token.marginSM }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading}
                                        size="large"
                                        block
                                        style={{ background: BRAND.orange, borderColor: BRAND.orange }}
                                    >
                                        Iniciar sesión
                                    </Button>
                                </Form.Item>

                                <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                                    <Button type="link" disabled style={{ color: token.colorTextDisabled }}>
                                        Olvidé mi contraseña
                                    </Button>
                                </Form.Item>
                            </Form>
                        </Flex>
                    </Col>

                    {!isMobile && (
                        <Col xs={0} md={12}>
                            <Flex vertical align="center" justify="center" gap={token.marginLG} style={{ minHeight: 380 }}>
                                <Flex align="center" gap={12}>
                                    <img
                                        src={`${import.meta.env.BASE_URL}iieg-favicon-192.png`}
                                        alt="Mariachi"
                                        style={{ height: 56, width: 'auto' }}
                                    />
                                    <Title level={1} style={{ margin: 0, color: BRAND.numeralia, fontWeight: 700, letterSpacing: 1 }}>
                                        Mariachi
                                    </Title>
                                </Flex>
                                <img
                                    src={`${import.meta.env.BASE_URL}iieg-logo.png`}
                                    alt="IIEG"
                                    style={{ maxWidth: 240, width: '100%', height: 'auto' }}
                                />
                            </Flex>
                        </Col>
                    )}
                </Row>
            </div>

            <Flex vertical align="center" gap={token.marginSM} style={{ marginTop: token.marginXL }}>
                <img
                    src={`${import.meta.env.BASE_URL}jalisco-logo.svg`}
                    alt="Gobierno de Jalisco"
                    style={{ height: 52, width: 'auto' }}
                />
                <TypoLink
                    href="https://iieg.gob.mx/ns/wp-content/uploads/2025/06/Aviso_de_Privacidad_Integral_IIEG_06_2025.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        fontSize: 10,
                        color: '#fff',
                        textDecoration: 'underline',
                        fontWeight: 700,
                    }}
                >
                    Aviso de privacidad
                </TypoLink>
            </Flex>
        </Flex>
    );
}
