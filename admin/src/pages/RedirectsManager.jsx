import { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Typography,
    Input,
    Select,
    Tag,
    Modal,
    Form,
    message,
    Popconfirm,
    Alert,
    Divider,
    Statistic,
    Row,
    Col,
    Tooltip,
    Upload
} from 'antd';
import {
    SwapOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    DownloadOutlined,
    UploadOutlined,
    SearchOutlined,
    ReloadOutlined,
    LinkOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    WarningOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const REDIRECT_TYPES = {
    301: { label: '301 - Permanente', description: 'Redirección permanente', color: 'success' },
    302: { label: '302 - Temporal', description: 'Redirección temporal', color: 'processing' }
};

export default function RedirectsManager() {
    const [redirects, setRedirects] = useState([]);
    const [filteredRedirects, setFilteredRedirects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRedirect, setEditingRedirect] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [form] = Form.useForm();

    const mockRedirects = [
        {
            id: '1',
            from: '/old-page',
            to: '/new-page',
            type: 301,
            created: new Date('2024-01-10'),
            hits: 1250,
            lastHit: new Date('2024-01-25'),
            active: true
        },
        {
            id: '2',
            from: '/servicios-viejos',
            to: '/servicios',
            type: 301,
            created: new Date('2024-01-12'),
            hits: 890,
            lastHit: new Date('2024-01-24'),
            active: true
        },
        {
            id: '3',
            from: '/temp-promo',
            to: '/promociones-2024',
            type: 302,
            created: new Date('2024-01-15'),
            hits: 450,
            lastHit: new Date('2024-01-25'),
            active: true
        },
        {
            id: '4',
            from: '/contacto-viejo',
            to: '/contacto',
            type: 301,
            created: new Date('2024-01-08'),
            hits: 2100,
            lastHit: new Date('2024-01-25'),
            active: true
        },
        {
            id: '5',
            from: '/blog/old-article',
            to: '/blog/new-article',
            type: 301,
            created: new Date('2024-01-18'),
            hits: 320,
            lastHit: new Date('2024-01-23'),
            active: false
        }
    ];

    useEffect(() => {
        loadRedirects();
    }, []);

    useEffect(() => {
        filterRedirects();
    }, [redirects, searchTerm, typeFilter]);

    const loadRedirects = () => {
        setLoading(true);
        setTimeout(() => {
            setRedirects(mockRedirects);
            setLoading(false);
        }, 500);
    };

    const filterRedirects = () => {
        let filtered = redirects;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(r =>
                r.from.toLowerCase().includes(term) ||
                r.to.toLowerCase().includes(term)
            );
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(r => r.type === parseInt(typeFilter));
        }

        setFilteredRedirects(filtered);
    };

    const showModal = (redirect = null) => {
        setEditingRedirect(redirect);
        if (redirect) {
            form.setFieldsValue(redirect);
        } else {
            form.resetFields();
            form.setFieldsValue({ type: 301, active: true });
        }
        setModalVisible(true);
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();

            if (editingRedirect) {
                setRedirects(prev => prev.map(r =>
                    r.id === editingRedirect.id ? { ...r, ...values } : r
                ));
                message.success('Redirección actualizada correctamente');
            } else {
                const newRedirect = {
                    id: Date.now().toString(),
                    ...values,
                    created: new Date(),
                    hits: 0,
                    lastHit: null
                };
                setRedirects(prev => [newRedirect, ...prev]);
                message.success('Redirección creada correctamente');
            }

            setModalVisible(false);
            form.resetFields();
            setEditingRedirect(null);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleDelete = (id) => {
        setRedirects(prev => prev.filter(r => r.id !== id));
        message.success('Redirección eliminada correctamente');
    };

    const toggleActive = (id) => {
        setRedirects(prev => prev.map(r =>
            r.id === id ? { ...r, active: !r.active } : r
        ));
        message.success('Estado actualizado');
    };

    const exportRedirects = () => {
        const csvContent = [
            'From,To,Type,Active,Created,Hits',
            ...redirects.map(r =>
                `${r.from},${r.to},${r.type},${r.active},${r.created.toISOString()},${r.hits}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `redirects-${new Date().getTime()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        message.success('Redirecciones exportadas correctamente');
    };

    const columns = [
        {
            title: 'Desde',
            dataIndex: 'from',
            key: 'from',
            width: '25%',
            render: (text) => (
                <Text code strong>{text}</Text>
            )
        },
        {
            title: 'Hacia',
            dataIndex: 'to',
            key: 'to',
            width: '25%',
            render: (text) => (
                <Text code>{text}</Text>
            )
        },
        {
            title: 'Tipo',
            dataIndex: 'type',
            key: 'type',
            width: '10%',
            render: (type) => (
                <Tag color={REDIRECT_TYPES[type].color}>
                    {type}
                </Tag>
            ),
            filters: [
                { text: '301 - Permanente', value: 301 },
                { text: '302 - Temporal', value: 302 }
            ],
            onFilter: (value, record) => record.type === value
        },
        {
            title: 'Visitas',
            dataIndex: 'hits',
            key: 'hits',
            width: '10%',
            render: (hits) => (
                <Statistic
                    value={hits}
                    valueStyle={{ fontSize: 14 }}
                />
            ),
            sorter: (a, b) => a.hits - b.hits
        },
        {
            title: 'Última Visita',
            dataIndex: 'lastHit',
            key: 'lastHit',
            width: '12%',
            render: (date) => date ? (
                <Text>{date.toLocaleDateString('es-ES')}</Text>
            ) : (
                <Text type="secondary">Nunca</Text>
            ),
            sorter: (a, b) => (a.lastHit || 0) - (b.lastHit || 0)
        },
        {
            title: 'Estado',
            dataIndex: 'active',
            key: 'active',
            width: '8%',
            render: (active, record) => (
                <Tooltip title={active ? 'Activa' : 'Inactiva'}>
                    <Button
                        type="text"
                        size="small"
                        icon={active ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#d9d9d9' }} />}
                        onClick={() => toggleActive(record.id)}
                    />
                </Tooltip>
            ),
            filters: [
                { text: 'Activa', value: true },
                { text: 'Inactiva', value: false }
            ],
            onFilter: (value, record) => record.active === value
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: '10%',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Editar">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => showModal(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="¿Eliminar redirección?"
                        description="Esta acción no se puede deshacer"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okType="danger"
                    >
                        <Tooltip title="Eliminar">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const activeCount = redirects.filter(r => r.active).length;
    const totalHits = redirects.reduce((sum, r) => sum + r.hits, 0);
    const type301Count = redirects.filter(r => r.type === 301).length;
    const type302Count = redirects.filter(r => r.type === 302).length;

    return (
        <div>
            <Card>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>
                            <SwapOutlined /> Gestor de Redirecciones
                        </Title>
                        <Space>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={loadRedirects}
                                loading={loading}
                            >
                                Recargar
                            </Button>
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={exportRedirects}
                            >
                                Exportar
                            </Button>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => showModal()}
                            >
                                Nueva Redirección
                            </Button>
                        </Space>
                    </div>

                    <Alert
                        message="Redirecciones SEO"
                        description="Las redirecciones permiten enviar usuarios y motores de búsqueda desde una URL antigua a una nueva automáticamente."
                        type="info"
                        showIcon
                    />

                    <Row gutter={16}>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Total de Redirecciones"
                                    value={redirects.length}
                                    prefix={<SwapOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Activas"
                                    value={activeCount}
                                    valueStyle={{ color: '#52c41a' }}
                                    prefix={<CheckCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Permanentes (301)"
                                    value={type301Count}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Temporales (302)"
                                    value={type302Count}
                                    valueStyle={{ color: '#1890ff' }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Card size="small">
                        <Space wrap style={{ width: '100%' }}>
                            <Input
                                placeholder="Buscar redirecciones..."
                                prefix={<SearchOutlined />}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: 300 }}
                                allowClear
                            />
                            <Select
                                value={typeFilter}
                                onChange={setTypeFilter}
                                style={{ width: 180 }}
                            >
                                <Select.Option value="all">Todos los tipos</Select.Option>
                                <Select.Option value="301">301 - Permanente</Select.Option>
                                <Select.Option value="302">302 - Temporal</Select.Option>
                            </Select>
                        </Space>
                    </Card>

                    <Divider />

                    <Table
                        columns={columns}
                        dataSource={filteredRedirects}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total: ${total} redirecciones`
                        }}
                    />

                    <Alert
                        message="Recomendaciones"
                        description={
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                <li>Usa <Text strong>301</Text> para cambios permanentes de URL (mejor para SEO)</li>
                                <li>Usa <Text strong>302</Text> para redirecciones temporales</li>
                                <li>Evita cadenas de redirecciones (A → B → C)</li>
                                <li>Mantén actualizado tu sitemap después de crear redirecciones</li>
                                <li>Monitorea las redirecciones con 0 visitas, pueden ser innecesarias</li>
                            </ul>
                        }
                        type="info"
                        showIcon
                        icon={<InfoCircleOutlined />}
                    />
                </Space>
            </Card>

            <Modal
                title={
                    <Space>
                        <SwapOutlined />
                        <Text strong>{editingRedirect ? 'Editar' : 'Nueva'} Redirección</Text>
                    </Space>
                }
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                    setEditingRedirect(null);
                }}
                onOk={handleOk}
                okText={editingRedirect ? 'Actualizar' : 'Crear'}
                cancelText="Cancelar"
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ type: 301, active: true }}
                >
                    <Alert
                        message="Formato de URLs"
                        description="Usa rutas relativas sin el dominio. Ejemplo: /pagina-vieja en lugar de https://iieg.gob.mx/pagina-vieja"
                        type="info"
                        showIcon
                        icon={<InfoCircleOutlined />}
                        style={{ marginBottom: 16 }}
                    />

                    <Form.Item
                        label="Desde (URL Original)"
                        name="from"
                        rules={[
                            { required: true, message: 'Ingresa la URL de origen' },
                            { pattern: /^\//, message: 'La URL debe comenzar con /' }
                        ]}
                    >
                        <Input
                            prefix={<LinkOutlined />}
                            placeholder="/pagina-vieja"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Hacia (URL Nueva)"
                        name="to"
                        rules={[
                            { required: true, message: 'Ingresa la URL de destino' },
                            { pattern: /^(\/|https?:\/\/)/, message: 'La URL debe comenzar con / o http(s)://' }
                        ]}
                    >
                        <Input
                            prefix={<LinkOutlined />}
                            placeholder="/pagina-nueva"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Tipo de Redirección"
                        name="type"
                        rules={[{ required: true }]}
                    >
                        <Select>
                            <Select.Option value={301}>
                                <Space direction="vertical" size="small">
                                    <Text strong>301 - Redirección Permanente</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Usa cuando la página cambió permanentemente. Mejor para SEO.
                                    </Text>
                                </Space>
                            </Select.Option>
                            <Select.Option value={302}>
                                <Space direction="vertical" size="small">
                                    <Text strong>302 - Redirección Temporal</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Usa para cambios temporales. No transfiere autoridad SEO.
                                    </Text>
                                </Space>
                            </Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Estado"
                        name="active"
                        valuePropName="checked"
                    >
                        <Select>
                            <Select.Option value={true}>
                                <Space>
                                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                    <Text>Activa</Text>
                                </Space>
                            </Select.Option>
                            <Select.Option value={false}>
                                <Space>
                                    <WarningOutlined style={{ color: '#faad14' }} />
                                    <Text>Inactiva</Text>
                                </Space>
                            </Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
