import { Result, Button } from 'antd';
import { useRouteError, useNavigate } from 'react-router';

export default function ErrorBoundary() {
    const error = useRouteError();
    const navigate = useNavigate();

    const getErrorStatus = () => {
        if (error?.status) return error.status;
        if (error?.message?.includes('404')) return 404;
        if (error?.message?.includes('403')) return 403;
        return 500;
    };

    const getErrorTitle = () => {
        const status = getErrorStatus();
        switch (status) {
        case 404:
            return '404 - Página no encontrada';
        case 403:
            return '403 - Acceso denegado';
        case 500:
            return '500 - Error del servidor';
        default:
            return 'Error inesperado';
        }
    };

    const getErrorSubtitle = () => {
        const status = getErrorStatus();
        switch (status) {
        case 404:
            return 'Lo sentimos, la página que visitaste no existe.';
        case 403:
            return 'No tienes permisos para acceder a esta página.';
        case 500:
            return 'Lo sentimos, algo salió mal en el servidor.';
        default:
            return error?.message || 'Ha ocurrido un error inesperado.';
        }
    };

    const handleGoHome = () => {
        navigate('/');
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            background: '#f5f5f5'
        }}>
            <Result
                status={getErrorStatus() === 404 ? '404' : getErrorStatus() === 403 ? '403' : '500'}
                title={getErrorTitle()}
                subTitle={getErrorSubtitle()}
                extra={[
                    <Button type="primary" key="home" onClick={handleGoHome}>
                        Ir al Inicio
                    </Button>,
                    <Button key="back" onClick={handleGoBack}>
                        Volver
                    </Button>
                ]}
            />
        </div>
    );
}
