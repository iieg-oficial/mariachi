import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Modal, Input, List, Typography, Tag, Empty, Space } from 'antd';
import {
    SearchOutlined,
    FileTextOutlined,
    UserOutlined,
    PictureOutlined,
    MenuOutlined,
    LayoutOutlined,
    BgColorsOutlined
} from '@ant-design/icons';
import { searchGlobal } from '@services/searchService';

const { Text } = Typography;

const typeConfig = {
    page: { text: 'Página', color: 'blue', icon: <FileTextOutlined /> },
    user: { text: 'Usuario', color: 'purple', icon: <UserOutlined /> },
    media: { text: 'Media', color: 'orange', icon: <PictureOutlined /> },
    menu: { text: 'Menú', color: 'green', icon: <MenuOutlined /> },
    layout: { text: 'Layout', color: 'cyan', icon: <LayoutOutlined /> },
    style: { text: 'Estilo', color: 'magenta', icon: <BgColorsOutlined /> }
};

export default function GlobalSearch({ open, onClose }) {
    const [searchValue, setSearchValue] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        performSearch();
    }, [searchValue]);

    const performSearch = async () => {
        if (!searchValue.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const data = await searchGlobal(searchValue);
            setResults(data);
        } catch (error) {
            console.error('Error searching:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item) => {
        navigate(item.url);
        handleClose();
    };

    const handleClose = () => {
        setSearchValue('');
        setResults([]);
        onClose();
    };

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            footer={null}
            width={600}
            closable={false}
            styles={{ body: { padding: 0 } }}
        >
            <Input
                size="large"
                placeholder="Buscar en todo el CMS... (Ctrl+K)"
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                autoFocus
                style={{ borderRadius: 0, border: 'none' }}
            />

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Text type="secondary">Buscando...</Text>
                </div>
            ) : results.length > 0 ? (
                <List
                    dataSource={results}
                    style={{ maxHeight: 400, overflow: 'auto' }}
                    renderItem={(item) => {
                        const config = typeConfig[item.type] || typeConfig.page;
                        return (
                            <List.Item
                                onClick={() => handleSelect(item)}
                                style={{ cursor: 'pointer', padding: '12px 24px' }}
                            >
                                <List.Item.Meta
                                    avatar={config.icon}
                                    title={
                                        <Space>
                                            <Text>{item.title}</Text>
                                            <Tag color={config.color} style={{ fontSize: 11 }}>
                                                {item.category}
                                            </Tag>
                                        </Space>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            ) : searchValue ? (
                <Empty
                    description="No se encontraron resultados"
                    style={{ padding: 40 }}
                />
            ) : (
                <div style={{ padding: 24 }}>
                    <Text type="secondary">Escribe para buscar páginas, usuarios, archivos y más...</Text>
                </div>
            )}
        </Modal>
    );
}
