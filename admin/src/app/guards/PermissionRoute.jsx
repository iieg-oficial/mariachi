import { Navigate, useLocation } from 'react-router';
import { Result, Button } from 'antd';
import { useAuth } from '@shared/contexts/useAuth';
import { useNavigate } from 'react-router';
import { buildLoginPath } from '@shared/helpers/loginRedirect';

export default function PermissionRoute({ children, anyOf = [] }) {
    const { user, canAny } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user) {
        return <Navigate to={buildLoginPath(location)} replace />;
    }

    if (anyOf.length > 0 && !canAny(anyOf)) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Result
                    status="403"
                    title="403"
                    subTitle="Lo sentimos, no tienes permisos para acceder a esta página."
                    extra={
                        <Button type="primary" onClick={() => navigate('/')}>
                            Volver al Inicio
                        </Button>
                    }
                />
            </div>
        );
    }

    return children;
}
