import { Navigate, useLocation } from 'react-router';
import { Spin, Result, Button } from 'antd';
import { useAuth } from '@shared/contexts/useAuth';
import { buildLoginPath } from '@shared/helpers/loginRedirect';

const SIEEJ_LOGIN_PATH = '/sieej/inicio-sesion';

const PANEL_PERMISSIONS = [
    'mariachi.mapalab.view',
    'mariachi.portal.view',
    'mariachi.sieej_admin.view',
    'mariachi.sieej_documentacion.view',
    'mariachi.acervo.view',
    'mariachi.colibri_reportes.view',
    'mariachi.colibri_config.manage',
    'mariachi.mel.view',
    'mariachi.identidad.view',
    'mariachi.geoserver.view',
    'mariachi.actividad.view',
    'mariachi.usuarios.view',
    'mariachi.sistema.manage',
    'mariachi.mapalab_llaves.manage',
    'mariachi.mapalab_propuestas.approve',
];

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading, canAny, can, logout } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh'
            }}>
                <Spin size="large" tip="Cargando...">
                    <div style={{ padding: 50 }} />
                </Spin>
            </div>
        );
    }

    if (!isAuthenticated()) {
        return <Navigate to={buildLoginPath(location)} replace />;
    }

    if (!canAny(PANEL_PERMISSIONS)) {
        const esRespondent = can('mariachi.sieej_envios.create');
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh'
            }}>
                <Result
                    status="403"
                    title="Acceso restringido"
                    subTitle={esRespondent
                        ? 'Tu cuenta captura formularios de SIEEJ, no administra el panel. Te llevamos a la plataforma de SIEEJ.'
                        : 'Tu cuenta no tiene permisos en Mariachi. Pide que te asignen un rol de la aplicacion en Minerva.'}
                    extra={[
                        esRespondent ? (
                            <Button
                                key="sieej"
                                type="primary"
                                onClick={() => { window.location.href = SIEEJ_LOGIN_PATH; }}
                            >
                                Ir a SIEEJ
                            </Button>
                        ) : null,
                        <Button key="logout" onClick={async () => { await logout(); }}>
                            Cerrar sesion
                        </Button>,
                    ].filter(Boolean)}
                />
            </div>
        );
    }

    return children;
}
