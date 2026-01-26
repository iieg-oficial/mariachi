import { useState, useEffect } from 'react';
import {
    Card, Table, Button, Space, Typography, Tag,
    Modal, Alert, Tooltip, Empty, Progress, message
} from 'antd';
import {
    DeleteOutlined, RollbackOutlined, ExclamationCircleOutlined, 
    ClearOutlined, ClockCircleOutlined, WarningOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const DAYS_BEFORE_PERMANENT_DELETE = 30;

export default function Trash() {
    const [trashedPages, setTrashedPages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const loadTrashedPages = () => {
        setLoading(true);

        const mockTrashedPages = [
            {
                id: '1',
                title: 'Página de Prueba Antigua',
                slug: '/prueba-antigua',
                deletedBy: 'Juan Pérez',
                deletedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                originalStatus: 'draft',
                size: '2.3 KB'
            },
            {
                id: '2',
                title: 'Evento Temporal 2023',
                slug: '/eventos/temporal-2023',
                deletedBy: 'María García',
                deletedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                originalStatus: 'published',
                size: '5.1 KB'
            },
            {
                id: '3',
                title: 'Borrador Descartado',
                slug: '/borrador-viejo',
                deletedBy: 'Ana López',
                deletedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
                originalStatus: 'draft',
                size: '1.8 KB'
            }
        ];

        setTimeout(() => {
            setTrashedPages(mockTrashedPages);
            setLoading(false);
        }, 500);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadTrashedPages();
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    const getDaysRemaining = (deletedAt) => {
        const now = new Date();
        const deleted = new Date(deletedAt);
        const diffTime = now - deleted;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return DAYS_BEFORE_PERMANENT_DELETE - diffDays;
    };

    const getProgressPercent = (deletedAt) => {
        const daysRemaining = getDaysRemaining(deletedAt);
        return ((DAYS_BEFORE_PERMANENT_DELETE - daysRemaining) / DAYS_BEFORE_PERMANENT_DELETE) * 100;
    };

    const getProgressColor = (deletedAt) => {
        const daysRemaining = getDaysRemaining(deletedAt);
        if (daysRemaining <= 5) return '#ff4d4f';
        if (daysRemaining <= 10) return '#faad14';
        return '#1890ff';
    };

    const handleRestore = (record) => {
        Modal.confirm({
            title: '¿Restaurar esta página?',
            icon: <RollbackOutlined />,
            content: (
                <Space direction="vertical">
                    <Text>La página "{record.title}" será restaurada a su estado anterior.</Text>
                    <Text type="secondary">Estado original: {record.originalStatus}</Text>
                </Space>
            ),
            okText: 'Restaurar',
            okType: 'primary',
            cancelText: 'Cancelar',
            onOk: () => {
                setLoading(true);
                setTimeout(() => {
                    setTrashedPages(trashedPages.filter(page => page.id !== record.id));
                    setLoading(false);
                    message.success(`Página "${record.title}" restaurada correctamente`);
                }, 500);
            }
        });
    };

    const handlePermanentDelete = (record) => {
        Modal.confirm({
            title: '¿Eliminar permanentemente?',
            icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
            content: (
                <Space direction="vertical">
                    <Alert
                        message="¡Advertencia!"
                        description="Esta acción no se puede deshacer. La página será eliminada permanentemente."
                        type="error"
                        showIcon
                    />
                    <Text>Página: <Text strong>{record.title}</Text></Text>
                </Space>
            ),
            okText: 'Eliminar permanentemente',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                setLoading(true);
                setTimeout(() => {
                    setTrashedPages(trashedPages.filter(page => page.id !== record.id));
                    setLoading(false);
                    message.success('Página eliminada permanentemente');
                }, 500);
            }
        });
    };

    const handleBulkRestore = () => {
        Modal.confirm({
            title: `¿Restaurar ${selectedRowKeys.length} página(s)?`,
            icon: <RollbackOutlined />,
            content: 'Las páginas seleccionadas serán restauradas a su estado anterior.',
            okText: 'Restaurar todas',
            okType: 'primary',
            cancelText: 'Cancelar',
            onOk: () => {
                setLoading(true);
                setTimeout(() => {
                    setTrashedPages(trashedPages.filter(page => !selectedRowKeys.includes(page.id)));
                    setSelectedRowKeys([]);
                    setLoading(false);
                    message.success(`${selectedRowKeys.length} página(s) restaurada(s) correctamente`);
                }, 500);
            }
        });
    };

    const handleBulkDelete = () => {
        Modal.confirm({
            title: `¿Eliminar permanentemente ${selectedRowKeys.length} página(s)?`,
            icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
            content: (
                <Space direction="vertical">
                    <Alert
                        message="¡Advertencia!"
                        description="Esta acción no se puede deshacer. Las páginas seleccionadas serán eliminadas permanentemente."
                        type="error"
                        showIcon
                    />
                </Space>
            ),
            okText: 'Eliminar permanentemente',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                setLoading(true);
                setTimeout(() => {
                    setTrashedPages(trashedPages.filter(page => !selectedRowKeys.includes(page.id)));
                    setSelectedRowKeys([]);
                    setLoading(false);
                    message.success(`${selectedRowKeys.length} página(s) eliminada(s) permanentemente`);
                }, 500);
            }
        });
    };

    const handleEmptyTrash = () => {
        Modal.confirm({
            title: '¿Vaciar papelera?',
            icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
            content: (
                <Space direction="vertical">
                    <Alert
                        message="¡Advertencia Crítica!"
                        description="Esta acción eliminará TODAS las páginas en la papelera de forma permanente. No se puede deshacer."
                        type="error"
                        showIcon
                    />
                    <Text>Total de páginas: <Text strong>{trashedPages.length}</Text></Text>
                </Space>
            ),
            okText: 'Vaciar papelera',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                setLoading(true);
                setTimeout(() => {
                    setTrashedPages([]);
                    setSelectedRowKeys([]);
                    setLoading(false);
                    message.success('Papelera vaciada correctamente');
                }, 500);
            }
        });
    };

    const columns = [
        {
            title: 'Título',
            dataIndex: 'title',
            key: 'title',
            width: '25%',
            render: (text, record) => (
                <Space direction="vertical" size="small">
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.slug}
                    </Text>
                </Space>
            )
        },
        {
            title: 'Estado Original',
            dataIndex: 'originalStatus',
            key: 'originalStatus',
            width: '12%',
            render: (status) => {
                const statusConfig = {
                    draft: { color: 'default', text: 'Borrador' },
                    published: { color: 'success', text: 'Publicado' },
                    approved: { color: 'processing', text: 'Aprobado' }
                };
                const config = statusConfig[status] || { color: 'default', text: status };
                return <Tag color={config.color}>{config.text}</Tag>;
            }
        },
        {
            title: 'Eliminado por',
            dataIndex: 'deletedBy',
            key: 'deletedBy',
            width: '13%'
        },
        {
            title: 'Fecha de eliminación',
            dataIndex: 'deletedAt',
            key: 'deletedAt',
            width: '15%',
            render: (date) => (
                <Space direction="vertical" size="small">
                    <Text>{new Date(date).toLocaleDateString('es-ES')}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </Space>
            ),
            sorter: (a, b) => new Date(a.deletedAt) - new Date(b.deletedAt),
            defaultSortOrder: 'descend'
        },
        {
            title: 'Tiempo restante',
            key: 'timeRemaining',
            width: '20%',
            render: (_, record) => {
                const daysRemaining = getDaysRemaining(record.deletedAt);
                const percent = getProgressPercent(record.deletedAt);
                const color = getProgressColor(record.deletedAt);

                return (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Space>
                            <ClockCircleOutlined style={{ color }} />
                            <Text style={{ color }}>
                                {daysRemaining} día{daysRemaining !== 1 ? 's' : ''}
                            </Text>
                        </Space>
                        <Progress
                            percent={percent}
                            strokeColor={color}
                            showInfo={false}
                            size="small"
                        />
                    </Space>
                );
            }
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: '15%',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Restaurar">
                        <Button
                            type="primary"
                            icon={<RollbackOutlined />}
                            onClick={() => handleRestore(record)}
                        >
                            Restaurar
                        </Button>
                    </Tooltip>
                    <Tooltip title="Eliminar permanentemente">
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handlePermanentDelete(record)}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys);
        }
    };

    return (
        <div>
            <Card>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>
                            <DeleteOutlined /> Papelera
                        </Title>
                        {trashedPages.length > 0 && (
                            <Button
                                danger
                                icon={<ClearOutlined />}
                                onClick={handleEmptyTrash}
                            >
                                Vaciar papelera
                            </Button>
                        )}
                    </div>

                    <Alert
                        message="Información sobre la papelera"
                        description={
                            <Space direction="vertical" size="small">
                                <Text>
                                    Las páginas eliminadas permanecen en la papelera durante {DAYS_BEFORE_PERMANENT_DELETE} días antes de ser eliminadas permanentemente.
                                </Text>
                                <Text>
                                    Puedes restaurar páginas en cualquier momento antes de que se eliminen automáticamente.
                                </Text>
                            </Space>
                        }
                        type="info"
                        showIcon
                        icon={<ClockCircleOutlined />}
                    />

                    {selectedRowKeys.length > 0 && (
                        <Alert
                            message={`${selectedRowKeys.length} página(s) seleccionada(s)`}
                            type="warning"
                            showIcon
                            action={
                                <Space>
                                    <Button
                                        size="small"
                                        type="primary"
                                        icon={<RollbackOutlined />}
                                        onClick={handleBulkRestore}
                                    >
                                        Restaurar seleccionadas
                                    </Button>
                                    <Button
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={handleBulkDelete}
                                    >
                                        Eliminar seleccionadas
                                    </Button>
                                </Space>
                            }
                        />
                    )}

                    <Table
                        rowSelection={rowSelection}
                        columns={columns}
                        dataSource={trashedPages}
                        rowKey="id"
                        loading={loading}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={<DeleteOutlined style={{ fontSize: 48, color: '#52c41a' }} />}
                                    description="La papelera está vacía"
                                >
                                    <Text type="secondary">
                                        Las páginas eliminadas aparecerán aquí
                                    </Text>
                                </Empty>
                            )
                        }}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} página(s) en papelera`,
                            pageSizeOptions: ['10', '20', '50']
                        }}
                        rowClassName={(record) => {
                            const daysRemaining = getDaysRemaining(record.deletedAt);
                            if (daysRemaining <= 5) return 'row-expiring-soon';
                            return '';
                        }}
                    />

                    {trashedPages.some(page => getDaysRemaining(page.deletedAt) <= 5) && (
                        <Alert
                            message="¡Atención!"
                            description="Algunas páginas serán eliminadas permanentemente en los próximos 5 días"
                            type="warning"
                            showIcon
                            icon={<WarningOutlined />}
                        />
                    )}
                </Space>
            </Card>
        </div>
    );
}
