import { Card, Tag, Button, Space, Typography, Alert, Timeline, Modal, Input } from 'antd';
import { useState } from 'react';
import {
    APPROVAL_STATUS,
    APPROVAL_STATUS_CONFIG,
    APPROVAL_PERMISSIONS,
    ALLOWED_TRANSITIONS
} from '@constants/approvalConstants';
import { useAuth } from '@contexts/AuthContext';

const { Text, Title } = Typography;
const { TextArea } = Input;

const ApprovalStatus = ({
    status = APPROVAL_STATUS.DRAFT,
    approvalHistory = [],
    onRequestApproval,
    onApprove,
    onReject,
    disabled = false
}) => {
    const { user } = useAuth();
    const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [requestModalVisible, setRequestModalVisible] = useState(false);
    const [requestMessage, setRequestMessage] = useState('');

    const statusConfig = APPROVAL_STATUS_CONFIG[status];
    const permissions = APPROVAL_PERMISSIONS[user?.role] || APPROVAL_PERMISSIONS.viewer;
    const StatusIcon = statusConfig?.icon;

    const canTransitionTo = (targetStatus) => {
        const allowedStatuses = ALLOWED_TRANSITIONS[status] || [];
        return allowedStatuses.includes(targetStatus);
    };

    const handleRequestApproval = () => {
        setRequestModalVisible(true);
    };

    const submitRequestApproval = () => {
        if (onRequestApproval) {
            onRequestApproval(requestMessage);
        }
        setRequestModalVisible(false);
        setRequestMessage('');
    };

    const handleReject = () => {
        setRejectionModalVisible(true);
    };

    const submitRejection = () => {
        if (onReject && rejectionReason.trim()) {
            onReject(rejectionReason);
        }
        setRejectionModalVisible(false);
        setRejectionReason('');
    };

    const handleApprove = () => {
        Modal.confirm({
            title: '¿Aprobar contenido?',
            content: 'El contenido será marcado como aprobado y estará listo para publicación.',
            okText: 'Aprobar',
            cancelText: 'Cancelar',
            onOk: onApprove
        });
    };

    return (
        <>
            <Card
                title={
                    <Space>
                        <Title level={5} style={{ margin: 0 }}>Estado de Aprobación</Title>
                        <Tag
                            color={statusConfig?.color}
                            icon={StatusIcon && <StatusIcon />}
                        >
                            {statusConfig?.label}
                        </Tag>
                    </Space>
                }
                style={{ marginBottom: 16 }}
            >
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <Alert
                        message={statusConfig?.description}
                        type={
                            status === APPROVAL_STATUS.REJECTED ? 'error' :
                                status === APPROVAL_STATUS.PENDING_APPROVAL ? 'warning' :
                                    status === APPROVAL_STATUS.APPROVED ? 'success' :
                                        'info'
                        }
                        showIcon
                    />

                    <Space wrap>
                        {permissions.canRequestApproval &&
                         canTransitionTo(APPROVAL_STATUS.PENDING_APPROVAL) &&
                         !disabled && (
                            <Button
                                type="primary"
                                onClick={handleRequestApproval}
                            >
                                Solicitar Aprobación
                            </Button>
                        )}

                        {permissions.canApprove &&
                         status === APPROVAL_STATUS.PENDING_APPROVAL &&
                         !disabled && (
                            <Button
                                type="primary"
                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                onClick={handleApprove}
                            >
                                Aprobar
                            </Button>
                        )}

                        {permissions.canReject &&
                         status === APPROVAL_STATUS.PENDING_APPROVAL &&
                         !disabled && (
                            <Button
                                danger
                                onClick={handleReject}
                            >
                                Rechazar
                            </Button>
                        )}
                    </Space>

                    {approvalHistory && approvalHistory.length > 0 && (
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                Historial de Revisión
                            </Text>
                            <Timeline
                                items={approvalHistory.map((entry) => ({
                                    color: entry.status === 'approved' ? 'green' :
                                           entry.status === 'rejected' ? 'red' :
                                           entry.status === 'requested' ? 'blue' : 'gray',
                                    children: (
                                        <div>
                                            <Text strong>
                                                {entry.status === 'approved' && 'Aprobado'}
                                                {entry.status === 'rejected' && 'Rechazado'}
                                                {entry.status === 'requested' && 'Solicitado'}
                                            </Text>
                                            <br />
                                            <Text type="secondary">{entry.userName} - {entry.date}</Text>
                                            {entry.comment && (
                                                <>
                                                    <br />
                                                    <Text>{entry.comment}</Text>
                                                </>
                                            )}
                                        </div>
                                    )
                                }))}
                            />
                        </div>
                    )}

                    {status === APPROVAL_STATUS.REJECTED && approvalHistory.length > 0 && (
                        <Alert
                            message="Motivo del rechazo"
                            description={approvalHistory[approvalHistory.length - 1]?.comment || 'Sin comentarios'}
                            type="error"
                            showIcon
                        />
                    )}
                </Space>
            </Card>

            <Modal
                title="Solicitar Aprobación"
                open={requestModalVisible}
                onOk={submitRequestApproval}
                onCancel={() => {
                    setRequestModalVisible(false);
                    setRequestMessage('');
                }}
                okText="Enviar Solicitud"
                cancelText="Cancelar"
            >
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Text>Agrega un mensaje opcional para el revisor:</Text>
                    <TextArea
                        rows={4}
                        placeholder="Mensaje para el revisor (opcional)"
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                    />
                </Space>
            </Modal>

            <Modal
                title="Rechazar Contenido"
                open={rejectionModalVisible}
                onOk={submitRejection}
                onCancel={() => {
                    setRejectionModalVisible(false);
                    setRejectionReason('');
                }}
                okText="Rechazar"
                okButtonProps={{ danger: true }}
                cancelText="Cancelar"
            >
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Alert
                        message="Especifica los cambios necesarios"
                        description="El autor recibirá este mensaje y podrá realizar los cambios solicitados."
                        type="warning"
                        showIcon
                    />
                    <TextArea
                        rows={4}
                        placeholder="Describe los cambios necesarios..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        required
                    />
                </Space>
            </Modal>
        </>
    );
};

export default ApprovalStatus;
