import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, Table, Button, Space, Tag, message, Spin } from 'antd';
import { EditOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '@services/api';

export default function Pages() {
    const navigate = useNavigate();
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        setLoading(true);
        try {
            const response = await api.get('/pages');
            setPages(response.data);
        } catch (error) {
            console.error('Error loading pages:', error);
            message.error('Error al cargar las páginas');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'Título',
            dataIndex: 'title',
            key: 'title',
            render: (text) => (
                <Space>
                    <FileTextOutlined />
                    <span>{text || 'Sin título'}</span>
                </Space>
            ),
        },
        {
            title: 'Ruta',
            dataIndex: 'slug',
            key: 'slug',
            render: (text) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: 'Secciones',
            dataIndex: 'sections',
            key: 'sections',
            width: 120,
            align: 'center',
            render: (sections) => sections?.length || 0,
        },
        {
            title: 'Estado',
            key: 'status',
            width: 120,
            align: 'center',
            render: (_, record) => {
                if (record.publishedAt) {
                    return <Tag color="success">Publicada</Tag>;
                }
                return <Tag color="default">Borrador</Tag>;
            },
        },
        {
            title: 'Última actualización',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            width: 180,
            render: (date) => {
                if (!date) return '-';
                return new Date(date).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            },
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/pages/edit/${record.menuItemId}`)}
                    >
                        Editar
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card
                title={
                    <Space>
                        <FileTextOutlined style={{ fontSize: 20 }} />
                        <span style={{ fontSize: 18, fontWeight: 600 }}>
                            Páginas
                        </span>
                    </Space>
                }
                extra={
                    <Tag color="blue">{pages.length} páginas</Tag>
                }
            >
                <Table
                    columns={columns}
                    dataSource={pages}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Total: ${total} páginas`,
                    }}
                />
            </Card>
        </div>
    );
}
