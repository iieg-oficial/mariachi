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
                background: BRAND.purple,
                overscrollBehavior: 'none',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 1088,
                    background: token.colorBgContainer,
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                }}
            >
                <Row>
                    <Col xs={24} md={12}>
                        <Flex
                            vertical
                            justify="center"
                            style={{
                                padding: isMobile ? token.paddingLG : 56,
                                minHeight: 480,
                            }}
                        >
                            <Flex vertical gap={token.marginXS} style={{ marginBottom: token.marginXL }}>
                                <div
                                    aria-hidden
                                    style={{
                                        width: 40,
                                        height: 4,
                                        borderRadius: 2,
                                        background: `linear-gradient(90deg, ${BRAND.numeralia}, ${BRAND.purple}, ${BRAND.orange})`,
                                        marginBottom: token.marginSM,
                                    }}
                                />
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
                            <Flex
                                vertical
                                align="center"
                                justify="center"
                                style={{
                                    padding: 56,
                                    minHeight: 480,
                                    background: token.colorBgContainer,
                                    borderLeft: `1px solid ${token.colorBorderSecondary}`,
                                    height: '100%',
                                }}
                            >
                                <img
                                    src={`${import.meta.env.BASE_URL}iieg-logo.png`}
                                    alt="IIEG"
                                    style={{ maxWidth: 280, width: '100%', height: 'auto' }}
                                />
                                <img
                                    src={`${import.meta.env.BASE_URL}jalisco-logo.svg`}
                                    alt="Gobierno de Jalisco"
                                    style={{ maxWidth: 200, width: '100%', height: 'auto', marginTop: token.marginXL }}
                                />
                            </Flex>
                        </Col>
                    )}
                </Row>
            </div>

            <TypoLink
                href="https://iieg.gob.mx/ns/wp-content/uploads/2025/06/Aviso_de_Privacidad_Integral_IIEG_06_2025.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    marginTop: token.marginLG,
                    fontSize: 12,
                    color: '#fff',
                }}
            >
                Aviso de privacidad
            </TypoLink>
        </Flex>
    );
}
