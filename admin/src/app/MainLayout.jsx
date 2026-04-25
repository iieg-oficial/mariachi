import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Drawer, Grid } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    LogoutOutlined,
    LockOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth } from '@shared/contexts/AuthContext';
import api from '@shared/services/api';
import { BRAND } from '@app/providers/MainProvider';
import { buildSiderItems, defaultOpenKeyForPath } from '@app/sider-config';

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

    const menuItems = buildSiderItems({
        user,
        onNavigate: handleNav,
        extras: { pendingCount },
    });

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Perfil',
        },
        {
            key: 'change-password',
            icon: <LockOutlined />,
            label: 'Cambiar Contraseña',
            onClick: () => navigate('/change-password'),
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Cerrar Sesión',
            onClick: handleLogout,
        },
    ];

    const brand = (isCollapsedView) => (
        <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '0 12px',
            color: '#fff',
        }}>
            <img
                src="/iieg-favicon-192.png"
                alt="IIEG"
                style={{
                    height: isCollapsedView ? 28 : 32,
                    width: 'auto',
                    flexShrink: 0,
                }}
            />
            {!isCollapsedView && (
                <span style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 }}>
                    Mariachi
                </span>
            )}
        </div>
    );

    const sideMenu = (
        <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            defaultOpenKeys={[defaultOpenKeyForPath(location.pathname)]}
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
                        header: { display: 'none' },
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
                    zIndex: 10,
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
                    minHeight: 280,
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
