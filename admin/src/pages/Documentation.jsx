import { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
    BookOutlined,
    FileTextOutlined,
    MenuOutlined,
    PictureOutlined,
    BgColorsOutlined,
    GlobalOutlined,
    UserOutlined,
    DeleteOutlined,
    ImportOutlined,
    HistoryOutlined,
    SearchOutlined,
    CheckCircleOutlined,
    AppstoreOutlined
} from '@ant-design/icons';

import { PagesDoc, SEODoc } from '@components/documentation';
import EditorDoc from '@components/documentation/EditorDoc';
import PageComponentsDoc from '@components/documentation/PageComponentsDoc';
import MenusDoc from '@components/documentation/MenusDoc';
import MediaDoc from '@components/documentation/MediaDoc';
import LayoutsDoc from '@components/documentation/LayoutsDoc';
import SearchDoc from '@components/documentation/SearchDoc';
import ApprovalsDoc from '@components/documentation/ApprovalsDoc';
import TrashDoc from '@components/documentation/TrashDoc';
import ImportExportDoc from '@components/documentation/ImportExportDoc';
import UsersDoc from '@components/documentation/UsersDoc';
import HistoryDoc from '@components/documentation/HistoryDoc';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function Documentation() {
    const [selectedKey, setSelectedKey] = useState('pages');

    const menuItems = [
        {
            key: 'pages',
            label: 'Gestión de Páginas',
            icon: <FileTextOutlined />
        },
        {
            key: 'editor',
            label: 'Editor de Páginas',
            icon: <FileTextOutlined />
        },
        {
            key: 'components',
            label: 'Componentes de Página',
            icon: <AppstoreOutlined />
        },
        {
            key: 'menus',
            label: 'Gestión de Menús',
            icon: <MenuOutlined />
        },
        {
            key: 'media',
            label: 'Multimedia',
            icon: <PictureOutlined />
        },
        {
            key: 'layouts',
            label: 'Layouts y Estilos',
            icon: <BgColorsOutlined />
        },
        {
            key: 'seo',
            label: 'SEO y Analytics',
            icon: <GlobalOutlined />
        },
        {
            key: 'search',
            label: 'Búsqueda de Contenido',
            icon: <SearchOutlined />
        },
        {
            key: 'approvals',
            label: 'Aprobaciones',
            icon: <CheckCircleOutlined />
        },
        {
            key: 'trash',
            label: 'Papelera',
            icon: <DeleteOutlined />
        },
        {
            key: 'import-export',
            label: 'Import/Export',
            icon: <ImportOutlined />
        },
        {
            key: 'users',
            label: 'Gestión de Usuarios',
            icon: <UserOutlined />
        },
        {
            key: 'history',
            label: 'Historial de Cambios',
            icon: <HistoryOutlined />
        }
    ];

    const renderContent = () => {
        switch (selectedKey) {
        case 'pages':
            return <PagesDoc />;
        case 'editor':
            return <EditorDoc />;
        case 'components':
            return <PageComponentsDoc />;
        case 'menus':
            return <MenusDoc />;
        case 'media':
            return <MediaDoc />;
        case 'layouts':
            return <LayoutsDoc />;
        case 'seo':
            return <SEODoc />;
        case 'search':
            return <SearchDoc />;
        case 'approvals':
            return <ApprovalsDoc />;
        case 'trash':
            return <TrashDoc />;
        case 'import-export':
            return <ImportExportDoc />;
        case 'users':
            return <UsersDoc />;
        case 'history':
            return <HistoryDoc />;
        default:
            return <PagesDoc />;
        }
    };

    return (
        <Layout style={{ background: '#fff', minHeight: '80vh' }}>
            <Sider
                width={250}
                style={{
                    background: '#fafafa',
                    borderRight: '1px solid #f0f0f0',
                    padding: '16px 0'
                }}
            >
                <div style={{ padding: '0 16px 16px' }}>
                    <Title level={4} style={{ margin: 0 }}>
                        <BookOutlined /> Documentación
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Guía de uso del sistema
                    </Text>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    items={menuItems}
                    onClick={({ key }) => setSelectedKey(key)}
                    style={{ background: 'transparent', border: 'none' }}
                />
            </Sider>
            <Content style={{ padding: '24px', overflow: 'auto' }}>
                {renderContent()}
            </Content>
        </Layout>
    );
}
