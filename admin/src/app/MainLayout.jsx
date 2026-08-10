import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Badge, Dropdown, Tooltip, Typography, Drawer, Grid } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    LogoutOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth } from '@shared/contexts/useAuth';
import api from '@shared/services/api';
import VersionNotesModal from '@features/inicio/components/VersionNotesModal';
import { BRAND } from '@app/providers/brand';
import {
    buildSiderFooterRail,
    buildSiderItems,
    defaultOpenKeyForPath,
    selectedKeyForPath,
} from '@app/sider-config';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [versionNotesOpen, setVersionNotesOpen] = useState(false);
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const navigate = useNavigate();
    const location = useLocation();
    const { user, can, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            navigate('/login');
        }
    };

    const [pendingCount, setPendingCount] = useState(0);
    const [reportesPendingCount, setReportesPendingCount] = useState(0);

    useEffect(() => {
        if (!can('mariachi.mapalab.update')) return;
        api.get('/borradores/pendientes')
            .then(r => setPendingCount(r.data.length))
            .catch(() => {});
    }, [user, can]);

    useEffect(() => {
        if (!can('mariachi.colibri_reportes.view')) return;
        api.get('/reportes/stats/contadores')
            .then(r => {
                const data = r.data || {};
                const total = Object.values(data).reduce((acc, byEstado) => acc + (byEstado?.nuevo || 0), 0);
                setReportesPendingCount(total);
            })
            .catch(() => {});
    }, [user, can]);

    useEffect(() => {
        if (isMobile) setMobileDrawerOpen(false);
    }, [location.pathname, isMobile]);

    const handleNav = (path) => {
        navigate(path);
        if (isMobile) setMobileDrawerOpen(false);
    };

    const menuItems = buildSiderItems({
        user,
        can,
        onNavigate: handleNav,
        extras: { pendingCount, reportesPendingCount },
    });
    const footerRailItems = [
        ...buildSiderFooterRail({ user, can, onNavigate: handleNav, extras: { pendingCount } }),
        {
            key: 'version-notes',
            label: 'Notas de versión',
            icon: <FileTextOutlined />,
            badgeCount: 0,
            onClick: () => {
                setVersionNotesOpen(true);
                if (isMobile) setMobileDrawerOpen(false);
            },
        },
    ];
    const selectedKey = selectedKeyForPath(location.pathname);

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Perfil',
            onClick: () => navigate('/perfil'),
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

    const openKey = defaultOpenKeyForPath(location.pathname);
    const defaultOpenKeys = openKey ? [openKey] : [];

    const renderFooterRail = () => (
        <div
            style={{
                display: 'flex',
                flexDirection: collapsed ? 'column' : 'row',
                alignItems: 'stretch',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
        >
            {footerRailItems.map((item, index) => {
                const active = selectedKey === item.key;
                const divider = index > 0 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none';
                return (
                    <Tooltip key={item.key} title={item.label} placement={collapsed ? 'right' : 'top'}>
                        <Button
                            type="text"
                            onClick={item.onClick}
                            aria-label={item.label}
                            style={{
                                flex: collapsed ? 'none' : 1,
                                minWidth: 0,
                                height: 44,
                                borderRadius: 0,
                                borderInlineStart: collapsed ? 'none' : divider,
                                borderTop: collapsed ? divider : 'none',
                            }}
                        >
                            <Badge count={item.badgeCount} size="small" offset={[6, -2]}>
                                <span style={{
                                    color: '#fff',
                                    opacity: active ? 1 : 0.75,
                                    fontSize: 16,
                                    display: 'inline-flex',
                                }}>
                                    {item.icon}
                                </span>
                            </Badge>
                        </Button>
                    </Tooltip>
                );
            })}
        </div>
    );

    const renderSiderContent = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {brand(collapsed)}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    defaultOpenKeys={defaultOpenKeys}
                    items={menuItems}
                    style={{ borderInlineEnd: 'none' }}
                />
            </div>
            {footerRailItems.length > 0 && renderFooterRail()}
        </div>
    );

    const footerRailAsMenuItems = footerRailItems.map((item) => ({
        key: item.key,
        icon: item.badgeCount > 0
            ? <Badge count={item.badgeCount} size="small" offset={[6, -2]}>{item.icon}</Badge>
            : item.icon,
        label: item.label,
        onClick: item.onClick,
    }));

    const renderMobileSiderContent = () => (
        <>
            {brand(false)}
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[selectedKey]}
                defaultOpenKeys={defaultOpenKeys}
                items={[...menuItems, ...footerRailAsMenuItems]}
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

            <VersionNotesModal
                open={versionNotesOpen}
                onClose={() => setVersionNotesOpen(false)}
            />
        </Layout>
    );
}
