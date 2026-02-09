import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@services/api';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications debe usarse dentro de NotificationProvider');
    }
    return context;
};

export const NOTIFICATION_TYPES = {
    APPROVAL_REQUEST: 'approval_request',
    APPROVAL_APPROVED: 'approval_approved',
    APPROVAL_REJECTED: 'approval_rejected',
    SCHEDULED_PUBLISH: 'scheduled_publish',
    COMMENT: 'comment',
    MENTION: 'mention',
    PAGE_UPDATED: 'page_updated',
    TRASH_EXPIRING: 'trash_expiring',
    SYSTEM: 'system'
};

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/notifications');
            const notifs = response.data.map(n => ({
                ...n,
                id: n.id.toString(),
                createdAt: new Date(n.created_at)
            }));
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    const markAsRead = async (notificationId) => {
        try {
            await api.put(`/notifications/${notificationId}/read`);
            setNotifications(prev => {
                const updated = prev.map(n =>
                    n.id === notificationId ? { ...n, read: true } : n
                );
                setUnreadCount(updated.filter(n => !n.read).length);
                return updated;
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await api.delete(`/notifications/${notificationId}`);
            setNotifications(prev => {
                const updated = prev.filter(n => n.id !== notificationId);
                setUnreadCount(updated.filter(n => !n.read).length);
                return updated;
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const clearAll = async () => {
        try {
            await api.delete('/notifications');
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    const addNotification = (notification) => {
        const newNotification = {
            id: Date.now().toString(),
            ...notification,
            read: false,
            createdAt: new Date()
        };
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
    };

    const value = {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        addNotification,
        refreshNotifications: loadNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
