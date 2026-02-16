import { useState, useEffect } from 'react';
import {
    Card, Table, Tag, Space, Row, Col, Statistic, Button,
    Typography, Tooltip, Input
} from 'antd';
import {
    HistoryOutlined, UserOutlined, EditOutlined, DeleteOutlined,
    PlusOutlined, ReloadOutlined, SearchOutlined
} from '@ant-design/icons';
import api from '@services/api';

const { Text } = Typography;

const actionColors = {
    create: 'success',
    update: 'processing',
    delete: 'error'
};

const actionIcons = {
    create: <PlusOutlined />,
    update: <EditOutlined />,
    delete: <DeleteOutlined />
};

const actionLabels = {
    create: 'Crear',
    update: 'Actualizar',
    delete: 'Eliminar'
};

const resourceLabels = {
    page: 'Página',
    menu: 'Menú',
    layout: 'Layout',
    styles: 'Estilos',
    user: 'Usuario',
    icon: 'Icono'
};

export default function History() {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        userId: null,
        resource: null,
        action: null,
        search: ''
    });

    useEffect(() => {
        loadHistory();
        loadStats();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.resource) params.append('resource', filters.resource);
            if (filters.action) params.append('action', filters.action);

            const response = await api.get(`/historial?${params.toString()}`);
            setHistory(response.data);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await api.get('/historial/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const columns = [
        {
            title: 'Fecha/Hora',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 180,
            render: (date) => {
                const d = new Date(date);
                return (
                    <div>
                        <div>{d.toLocaleDateString('es-MX')}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {d.toLocaleTimeString('es-MX')}
                        </Text>
                    </div>
                );
            },
            sorter: (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
            defaultSortOrder: 'descend'
        },
        {
            title: 'Usuario',
            key: 'user',
            width: 200,
            render: (_, record) => (
                <Space orientation="vertical" size={0}>
                    <Space>
                        <UserOutlined />
                        <Text strong>{record.userName}</Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.userRole}
                    </Text>
                </Space>
            ),
            filters: stats?.byUser ? Object.keys(stats.byUser).map(user => ({
                text: user,
                value: user
            })) : [],
            onFilter: (value, record) => record.userName === value
        },
        {
            title: 'Acción',
            dataIndex: 'action',
            key: 'action',
            width: 120,
            align: 'center',
            render: (action) => (
                <Tag color={actionColors[action]} icon={actionIcons[action]}>
                    {actionLabels[action]}
                </Tag>
            ),
            filters: [
                { text: 'Crear', value: 'create' },
                { text: 'Actualizar', value: 'update' },
                { text: 'Eliminar', value: 'delete' }
            ],
            onFilter: (value, record) => record.action === value
        },
        {
            title: 'Recurso',
            dataIndex: 'resource',
            key: 'resource',
            width: 120,
            render: (resource) => (
                <Tag color="blue">{resourceLabels[resource] || resource}</Tag>
            ),
            filters: stats?.byResource ? Object.keys(stats.byResource).map(resource => ({
                text: resourceLabels[resource] || resource,
                value: resource
            })) : [],
            onFilter: (value, record) => record.resource === value
        },
        {
            title: 'Descripción',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
            render: (text, record) => (
                <Tooltip title={JSON.stringify(record.details, null, 2)}>
                    <Text>{text}</Text>
                </Tooltip>
            )
        }
    ];

    const filteredData = history.filter(entry => {
        if (!filters.search) return true;
        const searchLower = filters.search.toLowerCase();
        return (
            entry.userName.toLowerCase().includes(searchLower) ||
            entry.description.toLowerCase().includes(searchLower) ||
            entry.resource.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div style={{ padding: 24 }}>
            {stats && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Total de Acciones"
                                value={stats.totalEntries}
                                prefix={<HistoryOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Creaciones"
                                value={stats.byAction.create || 0}
                                prefix={<PlusOutlined />}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Actualizaciones"
                                value={stats.byAction.update || 0}
                                prefix={<EditOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Eliminaciones"
                                value={stats.byAction.delete || 0}
                                prefix={<DeleteOutlined />}
                                valueStyle={{ color: '#ff4d4f' }}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            <Card
                title={
                    <Space>
                        <HistoryOutlined style={{ fontSize: 20 }} />
                        <span style={{ fontSize: 18, fontWeight: 600 }}>
                            Historial de Cambios
                        </span>
                    </Space>
                }
                extra={
                    <Space>
                        <Input
                            placeholder="Buscar..."
                            prefix={<SearchOutlined />}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            style={{ width: 200 }}
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                loadHistory();
                                loadStats();
                            }}
                        >
                            Actualizar
                        </Button>
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showTotal: (total) => `Total: ${total} acciones`,
                    }}
                    scroll={{ x: 1200 }}
                />
            </Card>
        </div>
    );
}
