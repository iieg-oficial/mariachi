import { useState } from 'react';
import { Badge, Button, Drawer, List, Typography, Space, Tag, Empty, Tooltip, Dropdown } from 'antd';
import {
    BellOutlined,
    CheckOutlined,
    DeleteOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    CommentOutlined,
    UserOutlined,
    FileTextOutlined,
    WarningOutlined,
    InfoCircleOutlined,
    ClearOutlined
} from '@ant-design/icons';
import { useNotifications, NOTIFICATION_TYPES } from '@contexts/NotificationContext';
import { useNavigate } from 'react-router';

const { Text, Title } = Typography;

const NotificationCenter = () => {
    const navigate = useNavigate();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();

    const getNotificationIcon = (type) => {
        const iconMap = {
            [NOTIFICATION_TYPES.APPROVAL_REQUEST]: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
            [NOTIFICATION_TYPES.APPROVAL_APPROVED]: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            [NOTIFICATION_TYPES.APPROVAL_REJECTED]: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
            [NOTIFICATION_TYPES.SCHEDULED_PUBLISH]: <ClockCircleOutlined style={{ color: '#722ed1' }} />,
            [NOTIFICATION_TYPES.COMMENT]: <CommentOutlined style={{ color: '#faad14' }} />,
            [NOTIFICATION_TYPES.MENTION]: <UserOutlined style={{ color: '#13c2c2' }} />,
            [NOTIFICATION_TYPES.PAGE_UPDATED]: <FileTextOutlined style={{ color: '#1890ff' }} />,
            [NOTIFICATION_TYPES.TRASH_EXPIRING]: <WarningOutlined style={{ color: '#ff4d4f' }} />,
            [NOTIFICATION_TYPES.SYSTEM]: <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
        };
        return iconMap[type] || <BellOutlined />;
    };

    const getNotificationColor = (type) => {
        const colorMap = {
            [NOTIFICATION_TYPES.APPROVAL_REQUEST]: 'blue',
            [NOTIFICATION_TYPES.APPROVAL_APPROVED]: 'success',
            [NOTIFICATION_TYPES.APPROVAL_REJECTED]: 'error',
            [NOTIFICATION_TYPES.SCHEDULED_PUBLISH]: 'purple',
            [NOTIFICATION_TYPES.COMMENT]: 'warning',
            [NOTIFICATION_TYPES.MENTION]: 'cyan',
            [NOTIFICATION_TYPES.PAGE_UPDATED]: 'processing',
            [NOTIFICATION_TYPES.TRASH_EXPIRING]: 'error',
            [NOTIFICATION_TYPES.SYSTEM]: 'default'
        };
        return colorMap[type] || 'default';
    };

    const getTypeLabel = (type) => {
        const labelMap = {
            [NOTIFICATION_TYPES.APPROVAL_REQUEST]: 'Solicitud',
            [NOTIFICATION_TYPES.APPROVAL_APPROVED]: 'Aprobado',
            [NOTIFICATION_TYPES.APPROVAL_REJECTED]: 'Rechazado',
            [NOTIFICATION_TYPES.SCHEDULED_PUBLISH]: 'Programación',
            [NOTIFICATION_TYPES.COMMENT]: 'Comentario',
            [NOTIFICATION_TYPES.MENTION]: 'Mención',
            [NOTIFICATION_TYPES.PAGE_UPDATED]: 'Actualización',
            [NOTIFICATION_TYPES.TRASH_EXPIRING]: 'Papelera',
            [NOTIFICATION_TYPES.SYSTEM]: 'Sistema'
        };
        return labelMap[type] || 'Notificación';
    };

    const getTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);

        if (seconds < 60) return 'Ahora';

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Hace ${minutes} min`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours} h`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `Hace ${days} d`;

        return new Date(date).toLocaleDateString('es-ES');
    };

    const handleNotificationClick = (notification) => {
        markAsRead(notification.id);

        if (notification.type === NOTIFICATION_TYPES.APPROVAL_REQUEST && notification.data?.pageId) {
            navigate('/approvals');
            setDrawerVisible(false);
        } else if (notification.type === NOTIFICATION_TYPES.APPROVAL_APPROVED && notification.data?.pageId) {
            navigate(`/pages/edit/${notification.data.pageId}`);
            setDrawerVisible(false);
        } else if (notification.type === NOTIFICATION_TYPES.TRASH_EXPIRING) {
            navigate('/trash');
            setDrawerVisible(false);
        } else if (notification.data?.pageId) {
            navigate(`/pages/edit/${notification.data.pageId}`);
            setDrawerVisible(false);
        }
    };

    const filteredNotifications = filterType === 'all'
        ? notifications
        : filterType === 'unread'
            ? notifications.filter(n => !n.read)
            : notifications.filter(n => n.type === filterType);

    const filterOptions = [
        { label: 'Todas', value: 'all' },
        { label: 'No leídas', value: 'unread' },
        { label: 'Aprobaciones', value: NOTIFICATION_TYPES.APPROVAL_REQUEST },
        { label: 'Comentarios', value: NOTIFICATION_TYPES.COMMENT },
        { label: 'Sistema', value: NOTIFICATION_TYPES.SYSTEM }
    ];

    return (
        <>
            <Badge count={unreadCount} offset={[-5, 5]}>
                <Button
                    type="text"
                    icon={<BellOutlined style={{ fontSize: 18 }} />}
                    onClick={() => setDrawerVisible(true)}
                />
            </Badge>

            <Drawer
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                            <BellOutlined />
                            <Title level={5} style={{ margin: 0 }}>Notificaciones</Title>
                            {unreadCount > 0 && (
                                <Badge count={unreadCount} style={{ backgroundColor: '#52c41a' }} />
                            )}
                        </Space>
                    </div>
                }
                placement="right"
                width={450}
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
                extra={
                    <Space>
                        {unreadCount > 0 && (
                            <Tooltip title="Marcar todas como leídas">
                                <Button
                                    type="text"
                                    icon={<CheckOutlined />}
                                    onClick={markAllAsRead}
                                />
                            </Tooltip>
                        )}
                        {notifications.length > 0 && (
                            <Tooltip title="Limpiar todas">
                                <Button
                                    type="text"
                                    danger
                                    icon={<ClearOutlined />}
                                    onClick={clearAll}
                                />
                            </Tooltip>
                        )}
                    </Space>
                }
            >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {filterOptions.map(option => (
                            <Tag.CheckableTag
                                key={option.value}
                                checked={filterType === option.value}
                                onChange={() => setFilterType(option.value)}
                            >
                                {option.label}
                            </Tag.CheckableTag>
                        ))}
                    </div>

                    {filteredNotifications.length === 0 ? (
                        <Empty
                            image={<BellOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                            description={
                                filterType === 'unread'
                                    ? 'No tienes notificaciones sin leer'
                                    : 'No tienes notificaciones'
                            }
                        />
                    ) : (
                        <List
                            dataSource={filteredNotifications}
                            renderItem={(notification) => (
                                <List.Item
                                    style={{
                                        padding: '12px',
                                        cursor: 'pointer',
                                        backgroundColor: notification.read ? 'transparent' : '#f0f2f5',
                                        borderRadius: 4,
                                        marginBottom: 8,
                                        transition: 'all 0.3s'
                                    }}
                                    onClick={() => handleNotificationClick(notification)}
                                    actions={[
                                        !notification.read && (
                                            <Tooltip title="Marcar como leída" key="read">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<CheckOutlined />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead(notification.id);
                                                    }}
                                                />
                                            </Tooltip>
                                        ),
                                        <Tooltip title="Eliminar" key="delete">
                                            <Button
                                                type="text"
                                                size="small"
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                            />
                                        </Tooltip>
                                    ].filter(Boolean)}
                                >
                                    <List.Item.Meta
                                        avatar={getNotificationIcon(notification.type)}
                                        title={
                                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                    <Text strong={!notification.read}>
                                                        {notification.title}
                                                    </Text>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        {getTimeAgo(notification.createdAt)}
                                                    </Text>
                                                </Space>
                                                <Tag color={getNotificationColor(notification.type)} style={{ marginRight: 0 }}>
                                                    {getTypeLabel(notification.type)}
                                                </Tag>
                                            </Space>
                                        }
                                        description={
                                            <Text type="secondary" style={{ fontSize: 13 }}>
                                                {notification.message}
                                            </Text>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    )}
                </Space>
            </Drawer>
        </>
    );
};

export default NotificationCenter;
