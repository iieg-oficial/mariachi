import { addHistoryEntry } from '../data/history';
import { users } from '../data/users';

export const logHistory = ({ userId, action, resource, resourceId, description, details = {} }) => {
    const user = users.find(u => u.id === userId);

    if (!user) {
        console.warn('Usuario no encontrado para historial:', userId);
        return null;
    }

    const entry = {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action,
        resource,
        resourceId,
        description,
        details
    };

    return addHistoryEntry(entry);
};

export const getUserIdFromRequest = (request) => {
    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            const userId = authHeader.replace('Bearer ', '');
            return userId;
        }

        return null;
    } catch (error) {
        console.error('Error extrayendo userId:', error);
        return null;
    }
};

export const getCurrentUserId = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.id;
        }
    } catch (error) {
        console.error('Error obteniendo usuario actual:', error);
    }
    return null;
};
