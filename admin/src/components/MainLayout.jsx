import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Badge } from 'antd';
import {
    MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined,
    TeamOutlined, LogoutOutlined,
    MenuOutlined,
    FileImageOutlined,
    LockOutlined,
    AuditOutlined,
    GlobalOutlined,
    EnvironmentOutlined,
    PartitionOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth } from '@contexts/AuthContext';
import api from '@services/api';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (user?.role !== 'tetlamamakani') return;
        api.get('/borradores/pendientes')
            .then(r => setPendingCount(r.data.length))
            .catch(() => {});
    }, [user]);

    const portalitoChildren = [];
    const mapalabChildren = [];

    if (user?.role === 'tetlamamakani') {
        portalitoChildren.push({
            key: '/users',
            icon: <TeamOutlined />,
            label: 'Usuarios',
            onClick: () => navigate('/users')
        });
        portalitoChildren.push({
            key: '/revision',
            icon: <AuditOutlined />,
            label: pendingCount > 0
                ? <span>Revisiones <Badge count={pendingCount} size="small" /></span>
                : 'Revisiones',
            onClick: () => navigate('/revision')
        });
    }

    if (user?.role === 'tetlamamakani' || user?.role === 'editora') {
        portalitoChildren.push({
            key: '/media',
            icon: <FileImageOutlined />,
            label: 'Media',
            onClick: () => navigate('/media')
        });
        portalitoChildren.push({
            key: '/menu',
            icon: <MenuOutlined />,
            label: 'Menú',
            onClick: () => navigate('/menu')
        });

        mapalabChildren.push({
            key: '/mapalab/layers',
            icon: <PartitionOutlined />,
            label: 'Capas',
            onClick: () => navigate('/mapalab/layers')
        });
    }

    const menuItems = [];
    if (portalitoChildren.length > 0) {
        menuItems.push({
            key: 'portalito',
            icon: <GlobalOutlined />,
            label: 'Portalito',
            children: portalitoChildren
        });
    }
    if (mapalabChildren.length > 0) {
        menuItems.push({
            key: 'mapalab',
            icon: <EnvironmentOutlined />,
            label: 'Mapalab',
            children: mapalabChildren
        });
    }

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Perfil'
        },
        {
            key: 'change-password',
            icon: <LockOutlined />,
            label: 'Cambiar Contraseña',
            onClick: () => navigate('/change-password')
        },
        {
            type: 'divider'
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Cerrar Sesión',
            onClick: handleLogout
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <div style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: collapsed ? 16 : 20,
                    fontWeight: 'bold'
                }}>
                    {collapsed ? 'MA' : 'Mariachi'}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    defaultOpenKeys={location.pathname.startsWith('/mapalab') ? ['mapalab'] : ['portalito']}
                    items={menuItems}
                />
            </Sider>
            <Layout>
                <Header style={{
                    padding: '0 24px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 4px rgba(0,21,41,.08)'
                }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: 16, width: 64, height: 64 }}
                    />
                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <Text style={{ marginRight: 8 }}>{user?.name}</Text>
                            <Avatar icon={<UserOutlined />} />
                        </div>
                    </Dropdown>
                </Header>
                <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
