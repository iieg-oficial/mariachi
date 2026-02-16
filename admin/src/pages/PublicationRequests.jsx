import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Input, Tag, message, Typography, Empty } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import api from '@services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function PublicationRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await api.get('/solicitudes-publicacion');
            setRequests(response.data);
        } catch {
            message.error('Error al cargar solicitudes');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request) => {
        setProcessing(true);
        try {
            await api.post(`/solicitudes-publicacion/${request.id}/aprobar`);
            message.success('Solicitud aprobada y cambios publicados');
            fetchRequests();
        } catch {
            message.error('Error al aprobar solicitud');
        } finally {
            setProcessing(false);
        }
    };

    const openRejectModal = (request) => {
        setSelectedRequest(request);
        setRejectReason('');
        setRejectModalVisible(true);
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            message.warning('Debes indicar un motivo de rechazo');
            return;
        }

        setProcessing(true);
        try {
            await api.post(`/solicitudes-publicacion/${selectedRequest.id}/rechazar`, {
                reason: rejectReason
            });
            message.success('Solicitud rechazada');
            setRejectModalVisible(false);
            fetchRequests();
        } catch {
            message.error('Error al rechazar solicitud');
        } finally {
            setProcessing(false);
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 60
        },
        {
            title: 'Tipo de recurso',
            dataIndex: 'resource_type',
            key: 'resource_type',
            render: (type) => (
                <Tag color="blue">{type}</Tag>
            )
        },
        {
            title: 'Solicitante',
            dataIndex: 'user_name',
            key: 'user_name'
        },
        {
            title: 'Fecha',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => new Date(date).toLocaleString('es-MX')
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const colors = {
                    pending: 'orange',
                    approved: 'green',
                    rejected: 'red'
                };
                const labels = {
                    pending: 'Pendiente',
                    approved: 'Aprobada',
                    rejected: 'Rechazada'
                };
                return <Tag color={colors[status]}>{labels[status]}</Tag>;
            }
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => handleApprove(record)}
                        loading={processing}
                        size="small"
                    >
                        Aprobar
                    </Button>
                    <Button
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => openRejectModal(record)}
                        size="small"
                    >
                        Rechazar
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div>
            <Title level={2}>Solicitudes de Publicación</Title>
            <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
                Revisa y aprueba las solicitudes de publicación de los editores.
            </Text>

            <Card>
                {requests.length > 0 ? (
                    <Table
                        columns={columns}
                        dataSource={requests}
                        rowKey="id"
                        loading={loading}
                        pagination={false}
                    />
                ) : (
                    <Empty description="No hay solicitudes pendientes" />
                )}
            </Card>

            <Modal
                title="Rechazar solicitud"
                open={rejectModalVisible}
                onCancel={() => setRejectModalVisible(false)}
                onOk={handleReject}
                okText="Rechazar"
                okType="danger"
                cancelText="Cancelar"
                confirmLoading={processing}
            >
                <Text>Indica el motivo del rechazo:</Text>
                <TextArea
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Escribe el motivo del rechazo..."
                    style={{ marginTop: 12 }}
                />
            </Modal>
        </div>
    );
}
