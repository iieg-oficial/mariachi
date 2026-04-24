import { createContext, useContext, useState, useEffect } from 'react';
import api from '@shared/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await api.get('/autenticacion/perfil');
            setUser(response.data);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

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
        try {
            await api.post('/autenticacion/cerrar-sesion');
        } catch {
        } finally {
            sessionStorage.removeItem('csrf_token');
            setUser(null);
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
        } catch (error) {
            setUser(null);
            throw error;
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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
