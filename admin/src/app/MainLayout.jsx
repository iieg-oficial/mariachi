import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Badge, Drawer, Grid } from 'antd';
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
import { useAuth } from '@shared/contexts/AuthContext';
import api from '@shared/services/api';
import { BRAND } from '@app/providers/MainProvider';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const screens = useBreakpoint();
    const isMobile = !screens.md;
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

    useEffect(() => {
        if (isMobile) setMobileDrawerOpen(false);
    }, [location.pathname, isMobile]);

    const handleNav = (path) => {
        navigate(path);
        if (isMobile) setMobileDrawerOpen(false);
    };

    const portalitoChildren = [];
    const mapalabChildren = [];

    if (user?.role === 'tetlamamakani') {
        portalitoChildren.push({
            key: '/users',
            icon: <TeamOutlined />,
            label: 'Usuarios',
            onClick: () => handleNav('/users')
        });
        portalitoChildren.push({
            key: '/revision',
            icon: <AuditOutlined />,
            label: pendingCount > 0
                ? <span>Revisiones <Badge count={pendingCount} size="small" /></span>
                : 'Revisiones',
            onClick: () => handleNav('/revision')
        });
    }

    if (user?.role === 'tetlamamakani' || user?.role === 'editora') {
        portalitoChildren.push({
            key: '/media',
            icon: <FileImageOutlined />,
            label: 'Media',
            onClick: () => handleNav('/media')
        });
        portalitoChildren.push({
            key: '/menu',
            icon: <MenuOutlined />,
            label: 'Menú',
            onClick: () => handleNav('/menu')
        });

        mapalabChildren.push({
            key: '/mapalab/layers',
            icon: <PartitionOutlined />,
            label: 'Capas',
            onClick: () => handleNav('/mapalab/layers')
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

    const brand = (isCollapsedView) => (
        <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: isCollapsedView ? 16 : 20,
            fontWeight: 'bold'
        }}>
            {isCollapsedView ? 'MA' : 'Mariachi'}
        </div>
    );

    const sideMenu = (
        <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            defaultOpenKeys={location.pathname.startsWith('/mapalab') ? ['mapalab'] : ['portalito']}
            items={menuItems}
        />
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {!isMobile && (
                <Sider trigger={null} collapsible collapsed={collapsed}>
                    {brand(collapsed)}
                    {sideMenu}
                </Sider>
            )}

            {isMobile && (
                <Drawer
                    placement="left"
                    open={mobileDrawerOpen}
                    onClose={() => setMobileDrawerOpen(false)}
                    closeIcon={null}
                    styles={{
                        wrapper: { width: 240 },
                        body: { padding: 0, background: BRAND.numeralia },
                        header: { display: 'none' }
                    }}
                >
                    {brand(false)}
                    {sideMenu}
                </Drawer>
            )}

            <Layout>
                <Header style={{
                    padding: isMobile ? '0 12px' : '0 24px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 4px rgba(0,21,41,.08)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <Button
                        type="text"
                        icon={collapsed || isMobile ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => {
                            if (isMobile) setMobileDrawerOpen(true);
                            else setCollapsed(!collapsed);
                        }}
                        style={{ fontSize: 16, width: isMobile ? 48 : 64, height: 64 }}
                        aria-label="Abrir menú"
                    />
                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            {!isMobile && <Text style={{ marginRight: 8 }}>{user?.name}</Text>}
                            <Avatar icon={<UserOutlined />} />
                        </div>
                    </Dropdown>
                </Header>
                <Content style={{
                    margin: isMobile ? '12px 8px' : '24px 16px',
                    padding: isMobile ? 12 : 24,
                    background: '#fff',
                    minHeight: 280
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
