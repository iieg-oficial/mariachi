import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography } from 'antd';
import {
    MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined,
    TeamOutlined, LogoutOutlined, HomeOutlined,
    LayoutOutlined, MenuOutlined, AppstoreOutlined, BookOutlined,
    FileTextOutlined, BgColorsOutlined, HistoryOutlined, FileImageOutlined,
    ClockCircleOutlined, SearchOutlined, DeleteOutlined, SwapOutlined, FontSizeOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth } from '@contexts/AuthContext';
import NotificationCenter from '@components/NotificationCenter';
import GlobalSearch from '@components/GlobalSearch';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout () {
    const [collapsed, setCollapsed] = useState(false);
    const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    useEffect(() => {
        const handleKeyPress = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setGlobalSearchOpen(true);
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    const menuItems = [
        {
            key: '/',
            icon: <HomeOutlined />,
            label: 'Inicio',
            onClick: () => navigate('/')
        },
        {
            key: '/documentation',
            icon: <BookOutlined />,
            label: 'Documentación',
            onClick: () => navigate('/documentation')
        }
    ];

    if (user?.role === 'tetlamamakani') {
        menuItems.push({
            key: '/users',
            icon: <TeamOutlined />,
            label: 'Usuarios',
            onClick: () => navigate('/users')
        });
        menuItems.push({
            key: '/approvals',
            icon: <ClockCircleOutlined />,
            label: 'Aprobaciones',
            onClick: () => navigate('/approvals')
        });
        menuItems.push({
            key: '/history',
            icon: <HistoryOutlined />,
            label: 'Historial',
            onClick: () => navigate('/history')
        });
        menuItems.push({
            key: '/import-export',
            icon: <SwapOutlined />,
            label: 'Import/Export',
            onClick: () => navigate('/import-export')
        });
    }

    if (user?.role === 'editora' || user?.role === 'diseñadora' || user?.role === 'tetlamamakani') {
        menuItems.push({
            key: '/pages',
            icon: <FileTextOutlined />,
            label: 'Páginas',
            onClick: () => navigate('/pages')
        });
        menuItems.push({
            key: '/search',
            icon: <SearchOutlined />,
            label: 'Buscar Contenido',
            onClick: () => navigate('/search')
        });
        menuItems.push({
            key: '/trash',
            icon: <DeleteOutlined />,
            label: 'Papelera',
            onClick: () => navigate('/trash')
        });
    }

    if (user?.role === 'editora' || user?.role === 'diseñadora' || user?.role === 'tetlamamakani') {
        menuItems.push({
            key: '/media',
            icon: <FileImageOutlined />,
            label: 'Media',
            onClick: () => navigate('/media')
        });
    }

    if (user?.role === 'tetlamamakani' || user?.role === 'diseñadora') {
        menuItems.push({
            key: '/fonts',
            icon: <FontSizeOutlined />,
            label: 'Fuentes',
            onClick: () => navigate('/fonts')
        });
        menuItems.push({
            key: '/layouts',
            icon: <LayoutOutlined />,
            label: 'Layouts',
            onClick: () => navigate('/layouts')
        });
        menuItems.push({
            key: '/menu',
            icon: <MenuOutlined />,
            label: 'Menú',
            onClick: () => navigate('/menu')
        });
        menuItems.push({
            key: '/icons',
            icon: <AppstoreOutlined />,
            label: 'Iconos',
            onClick: () => navigate('/icons')
        });
    }

    if (user?.role === 'tetlamamakani' || user?.role === 'diseñadora') {
        menuItems.push({
            key: '/styles',
            icon: <BgColorsOutlined />,
            label: 'Estilos',
            onClick: () => navigate('/styles')
        });
    }

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Perfil'
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
                    {collapsed ? 'CMS' : 'CMS Portal'}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Button
                            icon={<SearchOutlined />}
                            onClick={() => setGlobalSearchOpen(true)}
                        >
                            Buscar (Ctrl+K)
                        </Button>
                        <NotificationCenter />
                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <Text style={{ marginRight: 8 }}>{user?.name}</Text>
                                <Avatar icon={<UserOutlined />} />
                            </div>
                        </Dropdown>
                    </div>
                </Header>
                <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
                    <Outlet />
                </Content>
            </Layout>
            <GlobalSearch
                open={globalSearchOpen}
                onClose={() => setGlobalSearchOpen(false)}
            />
        </Layout>
    );
}
