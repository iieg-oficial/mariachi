import { Navigate } from 'react-router';
import { Spin } from 'antd';
import { useAuth } from '@shared/contexts/AuthContext';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

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
        return <Navigate to="/login" replace />;
    }

    return children;
}
