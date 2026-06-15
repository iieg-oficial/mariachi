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
import { useAuth } from '@shared/contexts/useAuth';
import api from '@shared/services/api';
import { BRAND } from '@app/providers/brand';
import { buildSiderFooterItems, buildSiderItems, defaultOpenKeyForPath, selectedKeyForPath } from '@app/sider-config';

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
    const [reportesPendingCount, setReportesPendingCount] = useState(0);

    useEffect(() => {
        if (user?.role !== 'tetlamamakani') return;
        api.get('/borradores/pendientes')
            .then(r => setPendingCount(r.data.length))
            .catch(() => {});
    }, [user]);

    useEffect(() => {
        if (!user?.role) return;
        api.get('/reportes/stats/contadores')
            .then(r => {
                const data = r.data || {};
                const total = Object.values(data).reduce((acc, byEstado) => acc + (byEstado?.nuevo || 0), 0);
                setReportesPendingCount(total);
            })
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
        extras: { pendingCount, reportesPendingCount },
    });
    const footerMenuItems = buildSiderFooterItems({ user, onNavigate: handleNav });
    const selectedKey = selectedKeyForPath(location.pathname);

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Perfil',
            onClick: () => navigate('/perfil'),
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
                src={`${import.meta.env.BASE_URL}iieg-favicon-192.png`}
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

    const FOOTER_HEIGHT = footerMenuItems.length > 0 ? 48 * footerMenuItems.length : 0;

    const renderSiderContent = () => (
        <div style={{ position: 'relative', height: '100%' }}>
            {brand(collapsed)}
            <div
                style={{
                    position: 'absolute',
                    top: 64,
                    left: 0,
                    right: 0,
                    bottom: FOOTER_HEIGHT,
                    overflowY: 'auto',
                }}
            >
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    defaultOpenKeys={[defaultOpenKeyForPath(location.pathname)]}
                    items={menuItems}
                    style={{ borderInlineEnd: 'none' }}
                />
            </div>
            {footerMenuItems.length > 0 && (
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    items={footerMenuItems}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        borderInlineEnd: 'none',
                    }}
                />
            )}
        </div>
    );

    const renderMobileSiderContent = () => (
        <>
            {brand(false)}
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[selectedKey]}
                defaultOpenKeys={[defaultOpenKeyForPath(location.pathname)]}
                items={[...menuItems, ...footerMenuItems]}
            />
        </>
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {!isMobile && (
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={280}
                    style={{
                        position: 'sticky',
                        top: 0,
                        height: '100vh',
                        overflow: 'hidden',
                    }}
                >
                    {renderSiderContent()}
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
                    {renderMobileSiderContent()}
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
                            <Avatar
                                src={user?.avatarUrl || user?.avatar_url || undefined}
                                icon={!(user?.avatarUrl || user?.avatar_url) && <UserOutlined />}
                            />
                        </div>
                    </Dropdown>
                </Header>
                <Content style={{
                    margin: isMobile ? '6px 4px' : '24px 16px',
                    padding: isMobile ? 6 : 24,
                    background: '#fff',
                    minHeight: 280,
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
