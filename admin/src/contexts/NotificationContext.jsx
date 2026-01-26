import { createContext, useContext, useState, useEffect } from 'react';

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

    useEffect(() => {
        loadNotifications();

        const interval = setInterval(() => {
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadNotifications = () => {
        const mockNotifications = [
            {
                id: '1',
                type: NOTIFICATION_TYPES.APPROVAL_REQUEST,
                title: 'Nueva solicitud de aprobación',
                message: 'Juan Pérez ha solicitado aprobación para "Página Principal"',
                data: {
                    pageId: '123',
                    pageTitle: 'Página Principal',
                    requestedBy: 'Juan Pérez'
                },
                read: false,
                createdAt: new Date(Date.now() - 5 * 60 * 1000)
            },
            {
                id: '2',
                type: NOTIFICATION_TYPES.APPROVAL_APPROVED,
                title: 'Aprobación confirmada',
                message: 'Tu página "Servicios" ha sido aprobada',
                data: {
                    pageId: '456',
                    pageTitle: 'Servicios',
                    approvedBy: 'María García'
                },
                read: false,
                createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
            },
            {
                id: '3',
                type: NOTIFICATION_TYPES.SCHEDULED_PUBLISH,
                title: 'Publicación programada completada',
                message: 'La página "Blog: Novedades 2024" se ha publicado automáticamente',
                data: {
                    pageId: '789',
                    pageTitle: 'Blog: Novedades 2024'
                },
                read: true,
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
                id: '4',
                type: NOTIFICATION_TYPES.COMMENT,
                title: 'Nuevo comentario',
                message: 'Ana López ha comentado en "Contacto"',
                data: {
                    pageId: '321',
                    pageTitle: 'Contacto',
                    commentBy: 'Ana López',
                    comment: 'Necesitamos actualizar el horario de atención'
                },
                read: true,
                createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
            },
            {
                id: '5',
                type: NOTIFICATION_TYPES.TRASH_EXPIRING,
                title: 'Páginas a punto de eliminarse',
                message: '2 páginas en papelera serán eliminadas permanentemente en 3 días',
                data: {
                    expiringCount: 2,
                    daysRemaining: 3
                },
                read: false,
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
        ];

        setNotifications(mockNotifications);
        updateUnreadCount(mockNotifications);
    };

    const updateUnreadCount = (notifs) => {
        const count = notifs.filter(n => !n.read).length;
        setUnreadCount(count);
    };

    const markAsRead = (notificationId) => {
        setNotifications(prev => {
            const updated = prev.map(n =>
                n.id === notificationId ? { ...n, read: true } : n
            );
            updateUnreadCount(updated);
            return updated;
        });
    };

    const markAllAsRead = () => {
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, read: true }));
            updateUnreadCount(updated);
            return updated;
        });
    };

    const deleteNotification = (notificationId) => {
        setNotifications(prev => {
            const updated = prev.filter(n => n.id !== notificationId);
            updateUnreadCount(updated);
            return updated;
        });
    };

    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    const addNotification = (notification) => {
        const newNotification = {
            id: Date.now().toString(),
            ...notification,
            read: false,
            createdAt: new Date()
        };

        setNotifications(prev => {
            const updated = [newNotification, ...prev];
            updateUnreadCount(updated);
            return updated;
        });
    };

    const value = {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        addNotification
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
