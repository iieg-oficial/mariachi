import { useState, useEffect, useCallback } from 'react';
import api, { refreshCsrfToken } from '@shared/services/api';
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

    const loginUser = async (username, password) => {
        const response = await api.post('/autenticacion/iniciar-sesion', {
            username,
            password
        });

        const { csrf_token } = response.data;
        sessionStorage.setItem('csrf_token', csrf_token);

        const profile = await api.get('/autenticacion/perfil');
        setUser(profile.data);

        return { ...response.data, user: profile.data };
    };

    const logout = async () => {
        await api.post('/autenticacion/cerrar-sesion').catch(() => null);
        sessionStorage.removeItem('csrf_token');
        setUser(null);
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

    const value = {
        user,
        loading,
        login: loginUser,
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
