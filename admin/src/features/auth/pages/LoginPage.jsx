import { useState } from 'react';
import { Form, Input, Button, Typography, Flex, Row, Col, theme } from 'antd';
import { useNavigate } from 'react-router';
import { useAuth } from '@shared/contexts/useAuth';
import useIsMobile from '@shared/hooks/useIsMobile';
import { BRAND } from '@app/providers/brand';
import { message } from '@shared/services/message';

const { Title, Text, Link: TypoLink } = Typography;
const { useToken } = theme;

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
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
            const status = error.response?.status;
            const detail = error.response?.data?.detail;

            if (status === 401) {
                form.setFields([
                    { name: 'password', errors: [detail || 'Usuario o contraseña incorrectos'] }
                ]);
            } else {
                message.error(detail || 'Error al iniciar sesión');
            }
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
                width: '100%',
                boxSizing: 'border-box',
                paddingInline: 'max(20px, env(safe-area-inset-left), env(safe-area-inset-right))',
                paddingBlock: 'max(24px, env(safe-area-inset-top))',
                paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
                background: `url(${import.meta.env.BASE_URL}login-background.svg) center / cover no-repeat`,
                overscrollBehavior: 'none',
                overflowX: 'hidden',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 1088,
                    marginInline: 'auto',
                    background: token.colorBgContainer,
                    borderRadius: 16,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    padding: 'clamp(32px, 5vw, 72px) clamp(20px, 4vw, 56px)',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            >
                <Row
                    gutter={[
                        { xs: 0, sm: 0, md: 32, lg: 48 },
                        { xs: 24, sm: 24, md: 0 },
                    ]}
                    align="middle"
                    style={{ margin: 0 }}
                >
                    <Col xs={24} md={12}>
                        <Flex vertical align="center" justify="center">
                            <div style={{ width: '100%', maxWidth: 260 }}>
                                <Flex vertical gap={4} style={{ marginBottom: token.marginXL }}>
                                    <Title style={{ margin: 0, color: BRAND.purple, fontSize: 22, fontWeight: 700, lineHeight: 1.2, fontFamily: '"Garet", sans-serif' }}>
                                        Hola
                                    </Title>
                                    <Text style={{ fontSize: 12, color: '#1f2937', fontWeight: 400, fontFamily: '"Garet", sans-serif' }}>
                                        Ingresa tus datos para iniciar sesión.
                                    </Text>
                                </Flex>

                                <Form
                                    form={form}
                                    name="login"
                                    onFinish={onFinish}
                                    autoComplete="off"
                                    layout="vertical"
                                    initialValues={import.meta.env.DEV ? { username: 'admin' } : {}}
                                    className="login-form-sieej"
                                    requiredMark={(label, info) => (
                                        <>
                                            {label}
                                            {info.required && (
                                                <span style={{ color: BRAND.orange, marginLeft: 4, fontWeight: 700 }}>*</span>
                                            )}
                                        </>
                                    )}
                                >
                                    <Form.Item
                                        label="Usuario o correo electrónico"
                                        name="username"
                                        normalize={(value) => (value ? value.replace(/\s/g, '').toLowerCase() : value)}
                                        rules={[{ required: true, message: 'Ingrese su usuario' }]}
                                    >
                                        <Input placeholder="Usuario o correo electrónico" />
                                    </Form.Item>

                                    <Form.Item
                                        label="Contraseña"
                                        name="password"
                                        rules={[{ required: true, message: 'Ingrese su contraseña' }]}
                                    >
                                        <Input.Password
                                            placeholder="Contraseña"
                                            iconRender={(visible) => (
                                                <img
                                                    src={`${import.meta.env.BASE_URL}${visible ? 'ico-show.svg' : 'ico-hidden.svg'}`}
                                                    alt={visible ? 'Mostrar' : 'Ocultar'}
                                                    style={{ width: 22, height: 22 }}
                                                />
                                            )}
                                        />
                                    </Form.Item>

                                    <Form.Item style={{ marginTop: token.marginXL, marginBottom: 0 }}>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={loading}
                                            block
                                            style={{
                                                background: BRAND.purple,
                                                borderColor: BRAND.purple,
                                                height: 40,
                                                borderRadius: 20,
                                                fontWeight: 700,
                                                fontSize: 14,
                                                fontFamily: '"Garet", sans-serif',
                                            }}
                                        >
                                            Iniciar sesión
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </div>
                        </Flex>
                    </Col>

                    {!isMobile && (
                        <Col xs={0} md={12}>
                            <Flex vertical align="center" justify="center" gap={32}>
                                <Flex align="center">
                                    <img
                                        src={`${import.meta.env.BASE_URL}iieg-favicon-192.png`}
                                        alt="Mariachi"
                                        style={{ height: 80, width: 'auto', marginRight: 2 }}
                                    />
                                    <div style={{ width: 1, height: 28, background: BRAND.orange }} aria-hidden />
                                    <Title level={1} style={{ margin: 0, marginLeft: 6, color: '#5B6770', fontWeight: 700, letterSpacing: 1, fontSize: 32, fontFamily: '"Garet", sans-serif' }}>
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

            <Flex vertical align="center" gap={20} style={{ marginTop: 40 }}>
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
                        fontFamily: '"Garet", sans-serif',
                    }}
                >
                    Aviso de privacidad
                </TypoLink>
            </Flex>
        </Flex>
    );
}
