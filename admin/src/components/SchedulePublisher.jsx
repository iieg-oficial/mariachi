import { Card, Button, Space, Typography, Alert, Tag, List, Modal, Input } from 'antd';
import { useState } from 'react';
import {
    ClockCircleOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    DeleteOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const SchedulePublisher = ({ pageId, currentSchedule, onSchedule, onCancel }) => {
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [schedules, setSchedules] = useState(currentSchedule?.schedules || []);

    const handleSchedule = () => {
        if (!scheduledDate || !scheduledTime) {
            Modal.error({
                title: 'Fecha y hora requeridas',
                content: 'Por favor selecciona una fecha y hora para la publicación programada.'
            });
            return;
        }

        const combinedDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

        if (combinedDateTime < new Date()) {
            Modal.error({
                title: 'Fecha inválida',
                content: 'No puedes programar una publicación en el pasado.'
            });
            return;
        }

        Modal.confirm({
            title: '¿Confirmar publicación programada?',
            content: (
                <Space direction="vertical">
                    <Text>La página se publicará automáticamente el:</Text>
                    <Text strong>{combinedDateTime.toLocaleString('es-ES')}</Text>
                    <Alert
                        message="Nota"
                        description="Puedes cancelar la publicación programada en cualquier momento antes de que se ejecute."
                        type="info"
                        showIcon
                    />
                </Space>
            ),
            okText: 'Confirmar',
            cancelText: 'Cancelar',
            onOk: () => {
                const newSchedule = {
                    id: Date.now(),
                    pageId,
                    date: combinedDateTime.toISOString(),
                    status: 'pending',
                    createdBy: 'Usuario Actual',
                    createdAt: new Date().toISOString()
                };

                setSchedules([...schedules, newSchedule]);

                if (onSchedule) {
                    onSchedule(newSchedule);
                }

                setScheduledDate('');
                setScheduledTime('');
            }
        });
    };

    const handleCancelSchedule = (scheduleId) => {
        Modal.confirm({
            title: '¿Cancelar publicación programada?',
            content: 'Esta acción no se puede deshacer.',
            okText: 'Cancelar Publicación',
            okType: 'danger',
            cancelText: 'Volver',
            onOk: () => {
                const updatedSchedules = schedules.filter(s => s.id !== scheduleId);
                setSchedules(updatedSchedules);

                if (onCancel) {
                    onCancel(scheduleId);
                }
            }
        });
    };

    const getScheduleStatus = (schedule) => {
        const scheduleDate = new Date(schedule.date);
        const now = new Date();

        if (schedule.status === 'completed') {
            return { text: 'Publicado', color: 'success' };
        }

        if (schedule.status === 'cancelled') {
            return { text: 'Cancelado', color: 'default' };
        }

        if (scheduleDate < now) {
            return { text: 'Procesando...', color: 'processing' };
        }

        return { text: 'Programado', color: 'warning' };
    };

    const getTimeRemaining = (date) => {
        const scheduleDate = new Date(date);
        const now = new Date();
        const diffMs = scheduleDate - now;

        if (diffMs < 0) return 'Pendiente';

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffDays > 0) return `En ${diffDays} día${diffDays > 1 ? 's' : ''}`;
        if (diffHours > 0) return `En ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        return `En ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <Card
            title={
                <Space>
                    <ClockCircleOutlined />
                    <Title level={5} style={{ margin: 0 }}>Publicación Programada</Title>
                </Space>
            }
        >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                    <Alert
                        message="Programa la publicación automática"
                        description="Selecciona la fecha y hora en que deseas que este contenido se publique automáticamente."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />

                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                <CalendarOutlined /> Fecha de publicación:
                            </Text>
                            <Input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={today}
                                style={{ width: '100%' }}
                                size="large"
                            />
                        </div>

                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                <ClockCircleOutlined /> Hora de publicación:
                            </Text>
                            <Input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                style={{ width: '100%' }}
                                size="large"
                            />
                        </div>

                        {scheduledDate && scheduledTime && (
                            <Alert
                                message="Vista previa"
                                description={
                                    <Text strong>
                                        Se publicará el {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('es-ES')}
                                    </Text>
                                }
                                type="success"
                                showIcon
                            />
                        )}

                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={handleSchedule}
                            disabled={!scheduledDate || !scheduledTime}
                            size="large"
                            block
                        >
                            Programar Publicación
                        </Button>
                    </Space>
                </div>

                {schedules.length > 0 && (
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 12 }}>
                            Publicaciones Programadas ({schedules.length})
                        </Text>
                        <List
                            dataSource={schedules}
                            renderItem={(schedule) => {
                                const status = getScheduleStatus(schedule);
                                const scheduleDate = new Date(schedule.date);

                                return (
                                    <List.Item
                                        actions={
                                            schedule.status === 'pending' ? [
                                                <Button
                                                    key="cancel"
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleCancelSchedule(schedule.id)}
                                                >
                                                    Cancelar
                                                </Button>
                                            ] : []
                                        }
                                    >
                                        <List.Item.Meta
                                            avatar={<CalendarOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                                            title={
                                                <Space>
                                                    <Text strong>{scheduleDate.toLocaleString('es-ES')}</Text>
                                                    <Tag color={status.color}>{status.text}</Tag>
                                                </Space>
                                            }
                                            description={
                                                <Space direction="vertical" size="small">
                                                    <Text type="secondary">
                                                        Creado por {schedule.createdBy} - {new Date(schedule.createdAt).toLocaleString('es-ES')}
                                                    </Text>
                                                    {schedule.status === 'pending' && (
                                                        <Text type="secondary">
                                                            {getTimeRemaining(schedule.date)}
                                                        </Text>
                                                    )}
                                                </Space>
                                            }
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    </div>
                )}
            </Space>
        </Card>
    );
};

export default SchedulePublisher;
