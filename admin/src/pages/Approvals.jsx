import { useState, useEffect } from 'react';
import { Layout, Card, Table, Tag, Button, Space, Typography, Empty, Badge, Tabs, message } from 'antd';
import { useNavigate } from 'react-router';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import { APPROVAL_STATUS, APPROVAL_STATUS_CONFIG } from '@constants/approvalConstants';
import api from '@services/api';

const { Title, Text } = Typography;
const { Content } = Layout;

export default function Approvals() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [approvedItems, setApprovedItems] = useState([]);
    const [rejectedItems, setRejectedItems] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');

    useEffect(() => {
        loadApprovals();
    }, []);

    const loadApprovals = async () => {
        setLoading(true);
        try {
            const pending = [
                {
                    id: 1,
                    title: 'Nueva página sobre estadísticas 2024',
                    author: 'María García',
                    requestedAt: '2024-10-30 14:30',
                    status: APPROVAL_STATUS.PENDING_APPROVAL,
                    type: 'Página',
                    message: 'Lista para revisión'
                },
                {
                    id: 2,
                    title: 'Actualización de convocatoria',
                    author: 'Juan Pérez',
                    requestedAt: '2024-10-30 10:15',
                    status: APPROVAL_STATUS.PENDING_APPROVAL,
                    type: 'Página',
                    message: 'Correcciones aplicadas'
                }
            ];

            const approved = [
                {
                    id: 3,
                    title: 'Comunicado oficial Octubre',
                    author: 'Ana López',
                    reviewedAt: '2024-10-29 16:45',
                    reviewedBy: 'Admin',
                    status: APPROVAL_STATUS.APPROVED,
                    type: 'Página'
                }
            ];

            const rejected = [
                {
                    id: 4,
                    title: 'Informe trimestral',
                    author: 'Carlos Ruiz',
                    reviewedAt: '2024-10-29 11:20',
                    reviewedBy: 'Admin',
                    status: APPROVAL_STATUS.REJECTED,
                    type: 'Página',
                    rejectionReason: 'Faltan datos actualizados de Q3'
                }
            ];

            setPendingApprovals(pending);
            setApprovedItems(approved);
            setRejectedItems(rejected);
        } catch (error) {
            console.error('Error loading approvals:', error);
            message.error('Error al cargar las aprobaciones');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.post(`/approvals/${id}/approve`);
            message.success('Contenido aprobado');
            loadApprovals();
        } catch (error) {
            console.error('Error approving:', error);
            message.error('Error al aprobar');
        }
    };

    const handleReject = async (id, reason) => {
        try {
            await api.post(`/approvals/${id}/reject`, { reason });
            message.success('Contenido rechazado');
            loadApprovals();
        } catch (error) {
            console.error('Error rejecting:', error);
            message.error('Error al rechazar');
        }
    };

    const handleView = (id) => {
        navigate(`/page-editor/${id}`);
    };

    const columns = [
        {
            title: 'Título',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <Space orientation="vertical" size="small">
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Por {record.author}
                    </Text>
                </Space>
            )
        },
        {
            title: 'Tipo',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag>{type}</Tag>
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const config = APPROVAL_STATUS_CONFIG[status];
                const StatusIcon = config?.icon;
                return (
                    <Tag color={config?.color} icon={StatusIcon && <StatusIcon />}>
                        {config?.label}
                    </Tag>
                );
            }
        },
        {
            title: 'Fecha',
            dataIndex: activeTab === 'pending' ? 'requestedAt' : 'reviewedAt',
            key: 'date'
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleView(record.id)}
                    >
                        Ver
                    </Button>
                    {activeTab === 'pending' && (
                        <>
                            <Button
                                size="small"
                                type="primary"
                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleApprove(record.id)}
                            >
                                Aprobar
                            </Button>
                            <Button
                                size="small"
                                danger
                                icon={<CloseCircleOutlined />}
                                onClick={() => {
                                    handleReject(record.id, 'Motivo de rechazo');
                                }}
                            >
                                Rechazar
                            </Button>
                        </>
                    )}
                </Space>
            )
        }
    ];

    const tabItems = [
        {
            key: 'pending',
            label: (
                <Badge count={pendingApprovals.length} offset={[10, 0]}>
                    <Space>
                        <ClockCircleOutlined />
                        Pendientes
                    </Space>
                </Badge>
            ),
            children: (
                <Table
                    loading={loading}
                    dataSource={pendingApprovals}
                    columns={columns}
                    rowKey="id"
                    locale={{
                        emptyText: (
                            <Empty
                                description="No hay aprobaciones pendientes"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )
                    }}
                />
            )
        },
        {
            key: 'approved',
            label: (
                <Space>
                    <CheckCircleOutlined />
                    Aprobados
                </Space>
            ),
            children: (
                <Table
                    loading={loading}
                    dataSource={approvedItems}
                    columns={columns}
                    rowKey="id"
                    locale={{
                        emptyText: (
                            <Empty
                                description="No hay items aprobados"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )
                    }}
                />
            )
        },
        {
            key: 'rejected',
            label: (
                <Space>
                    <CloseCircleOutlined />
                    Rechazados
                </Space>
            ),
            children: (
                <Table
                    loading={loading}
                    dataSource={rejectedItems}
                    columns={columns}
                    rowKey="id"
                    expandable={{
                        expandedRowRender: (record) => (
                            <div style={{ padding: '12px 24px', background: '#fff1f0' }}>
                                <Text strong>Motivo del rechazo:</Text>
                                <br />
                                <Text>{record.rejectionReason}</Text>
                            </div>
                        )
                    }}
                    locale={{
                        emptyText: (
                            <Empty
                                description="No hay items rechazados"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )
                    }}
                />
            )
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            <Content style={{ padding: 24 }}>
                <Card>
                    <Title level={3}>
                        <ClockCircleOutlined /> Gestión de Aprobaciones
                    </Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                        Revisa y gestiona las solicitudes de aprobación de contenido
                    </Text>

                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={tabItems}
                    />
                </Card>
            </Content>
        </Layout>
    );
}
