import { Navigate } from 'react-router';
import { Result, Button } from 'antd';
import { useAuth } from '@contexts/AuthContext';
import { useNavigate } from 'react-router';

export default function RoleProtectedRoute({ children, allowedRoles = [] }) {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
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
