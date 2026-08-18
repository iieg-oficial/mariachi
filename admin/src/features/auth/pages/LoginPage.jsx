import { useEffect, useRef, useState } from 'react';
import { Button, Typography, Flex, Row, Col, theme, Alert, Spin } from 'antd';
import { useSearchParams } from 'react-router';
import { useAuth } from '@shared/contexts/useAuth';
import { resolveNextPath } from '@shared/helpers/loginRedirect';
import { SALIENDO_KEY } from '@shared/services/api';
import useIsMobile from '@shared/hooks/useIsMobile';
import { BRAND } from '@app/providers/brand';

const { Title, Text, Link: TypoLink } = Typography;
const { useToken } = theme;

const AUTH_ERRORS = {
    access_denied: 'Tu cuenta no tiene acceso a Mariachi. Pide que te asignen un rol de la aplicación.',
    invalid_request: 'La solicitud de inicio de sesión no fue válida. Intenta de nuevo.',
    server_error: 'Minerva no pudo completar el inicio de sesión. Intenta más tarde.',
    invalid_state: 'El inicio de sesión tardó demasiado o se reinició en otra pestaña. Intenta de nuevo.',
};

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const { token } = useToken();
    const { isMobile } = useIsMobile();

    const authError = searchParams.get('auth_error');
    const autoRedirigido = useRef(false);
    const [saliendo] = useState(() => sessionStorage.getItem(SALIENDO_KEY) === '1');
    const forzar = searchParams.get('forzar') === '1' || saliendo;

    useEffect(() => {
        if (!authError) return;
        const url = new URL(window.location.href);
        url.searchParams.delete('auth_error');
        window.history.replaceState({}, '', url);
    }, [authError]);

    const onLogin = () => {
        setLoading(true);
        login(resolveNextPath(searchParams.get('next')), forzar);
    };

    useEffect(() => {
        if (authError || autoRedirigido.current) return;
        autoRedirigido.current = true;
        sessionStorage.removeItem(SALIENDO_KEY);
        setLoading(true);
        login(resolveNextPath(searchParams.get('next')), forzar);
    }, [authError, forzar, login, searchParams]);

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
                    maxWidth: authError ? 1088 : 420,
                    marginInline: 'auto',
                    background: token.colorBgContainer,
                    borderRadius: 16,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    padding: 'clamp(32px, 5vw, 72px) clamp(20px, 4vw, 56px)',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            >
                {!authError && (
                    <Flex vertical align="center" justify="center" gap={28}>
                        <Flex align="center">
                            <img
                                src={`${import.meta.env.BASE_URL}iieg-favicon-192.png`}
                                alt="Mariachi"
                                style={{ height: 72, width: 'auto', marginRight: 2 }}
                            />
                            <div style={{ width: 1, height: 26, background: BRAND.orange }} aria-hidden />
                            <Title level={1} style={{ margin: 0, marginLeft: 6, color: '#5B6770', fontWeight: 700, letterSpacing: 1, fontSize: 30, fontFamily: '"Garet", sans-serif' }}>
                                Mariachi
                            </Title>
                        </Flex>
                        <Spin size="large" />
                    </Flex>
                )}

                {authError && (
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
                                        Inicia sesión con tu cuenta institucional.
                                        </Text>
                                    </Flex>

                                    {authError && (
                                        <Alert
                                            type="error"
                                            showIcon
                                            style={{ marginBottom: token.marginLG }}
                                            message={AUTH_ERRORS[authError] || 'No se pudo iniciar sesión.'}
                                        />
                                    )}

                                    <Button
                                        type="primary"
                                        onClick={onLogin}
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
                )}
            </div>

            {/* Firma institucional: el IIEG es obligatorio en cualquier desarrollo del
                instituto. Variante para fondo oscuro, que es sobre lo que se pinta.
                Rejilla de tres columnas: la central la dimensiona el propio aviso, así
                que el hueco entre los logos mide exactamente lo que mide ese texto —el
                IIEG termina donde empieza y Jalisco arranca donde acaba— sin números
                mágicos que se rompan si cambia la leyenda. */}
            <div
                style={{
                    marginTop: 40,
                    display: 'grid',
                    gridTemplateColumns: isMobile
                        ? 'minmax(0, auto) 48px minmax(0, auto)'
                        : 'minmax(0, auto) auto minmax(0, auto)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    rowGap: isMobile ? 28 : 40,
                    maxWidth: '100%',
                }}
            >
                <img
                    src={`${import.meta.env.BASE_URL}iieg-logo-dark.svg`}
                    alt="Instituto de Información Estadística y Geográfica"
                    style={{
                        gridColumn: 1,
                        gridRow: 1,
                        height: isMobile ? 42 : 'clamp(30px, 8vw, 52px)',
                        width: 'auto',
                        maxWidth: '100%',
                        objectFit: 'contain',
                    }}
                />
                <img
                    src={`${import.meta.env.BASE_URL}jalisco-logo.svg`}
                    alt="Gobierno de Jalisco"
                    style={{
                        gridColumn: 3,
                        gridRow: 1,
                        height: isMobile ? 42 : 'clamp(30px, 8vw, 52px)',
                        width: 'auto',
                        maxWidth: '100%',
                        objectFit: 'contain',
                    }}
                />
                <TypoLink
                    href="https://iieg.jalisco.gob.mx/acervo/iieg/avisos-de-privacidad.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        gridColumn: isMobile ? '1 / -1' : 2,
                        gridRow: 2,
                        justifySelf: 'center',
                        fontSize: 10,
                        color: '#fff',
                        textDecoration: 'underline',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        fontFamily: '"Garet", sans-serif',
                        paddingInline: 16,
                    }}
                >
                    Aviso de privacidad
                </TypoLink>
            </div>
        </Flex>
    );
}
