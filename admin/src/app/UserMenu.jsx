import { Avatar, Badge, Dropdown, Space, Typography } from 'antd';
import {
    FileSyncOutlined,
    LogoutOutlined,
    UserOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export default function UserMenu({
    user,
    isMobile,
    borradores,
    onAbrirBorradores,
    onPerfil,
    onLogout,
}) {
    const rechazados = borradores.filter((b) => b.estado === 'rechazado').length;
    const avatarUrl = user?.avatarUrl || user?.avatar_url || undefined;

    const items = [
        {
            key: 'borradores',
            icon: <FileSyncOutlined />,
            label: (
                <Space size={8}>
                    <span>Mis borradores</span>
                    {borradores.length > 0 && (
                        <Badge
                            count={borradores.length}
                            color={rechazados > 0 ? 'red' : '#bfbfbf'}
                            size="small"
                        />
                    )}
                </Space>
            ),
            onClick: onAbrirBorradores,
        },
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Perfil',
            onClick: onPerfil,
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Cerrar Sesión',
            onClick: onLogout,
        },
    ];

    return (
        <Dropdown menu={{ items }} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                {!isMobile && <Text style={{ marginRight: 8 }}>{user?.name}</Text>}
                <Badge count={rechazados} size="small" offset={[-2, 2]}>
                    <Avatar src={avatarUrl} icon={!avatarUrl && <UserOutlined />} />
                </Badge>
            </div>
        </Dropdown>
    );
}
