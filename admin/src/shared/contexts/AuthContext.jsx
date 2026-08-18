import { useState, useEffect, useCallback, useMemo } from 'react';
import api, { refreshCsrfToken, buildMinervaLoginUrl } from '@shared/services/api';
import { AuthContext } from '@shared/contexts/useAuth';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const response = await api.get('/autenticacion/perfil');
            setUser(response.data);
            if (!sessionStorage.getItem('csrf_token')) {
                await refreshCsrfToken();
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        api.get('/autenticacion/perfil')
            .then(async (res) => {
                if (cancelled) return;
                setUser(res.data);
                if (!sessionStorage.getItem('csrf_token')) {
                    await refreshCsrfToken();
                }
            })
            .catch(() => { if (!cancelled) setUser(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const login = (next, forzar = false) => {
        window.location.href = buildMinervaLoginUrl(next, forzar);
    };

    const logout = async () => {
        const { data } = await api.post('/autenticacion/cerrar-sesion').catch(() => ({ data: null }));
        sessionStorage.removeItem('csrf_token');
        setUser(null);
        if (data?.logout_url) {
            window.location.href = data.logout_url;
        }
    };

    const isAuthenticated = () => {
        return user !== null;
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/autenticacion/perfil');
            setUser(response.data);
            return response.data;
        } catch (err) {
            setUser(null);
            throw err;
        }
    };

    const permissions = useMemo(
        () => new Set(user?.permissions || []),
        [user]
    );

    const can = useCallback((permission) => permissions.has(permission), [permissions]);
    const canAny = useCallback(
        (list = []) => list.some((permission) => permissions.has(permission)),
        [permissions]
    );

    const value = {
        user,
        loading,
        permissions,
        can,
        canAny,
        login,
        logout,
        isAuthenticated,
        refreshUser,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
