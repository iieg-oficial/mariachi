import { useState } from 'react';
import { Card, Form, Input, Button, Alert, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import api from '@shared/services/api';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';

const { Title, Text } = Typography;

export default function ChangePassword() {
    const [loading, setLoading] = useState(false);
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const onFinish = async (values) => {
        if (values.new_password !== values.confirm_password) {
            form.setFields([
                {
                    name: 'confirm_password',
                    errors: ['Las contraseñas no coinciden'],
                },
            ]);
            return;
        }

        setLoading(true);
        try {
            await api.post('/autenticacion/cambiar-contrasena', {
                current_password: values.current_password,
                new_password: values.new_password
            });
            message.success('Contraseña actualizada exitosamente');

            if (user?.must_change_password) {
                await refreshUser();
                navigate('/');
            } else {
                navigate(-1);
            }
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.detail || 'Error al actualizar contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
            padding: 12
        }}>
            <Card style={{ width: '100%', maxWidth: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', mb: 24 }}>
                    <LockOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 16 }} />
                    <Title level={3}>Cambiar Contraseña</Title>
                    {user?.must_change_password && (
                        <Alert
                            title="Cambio obligatorio"
                            description="Por seguridad, debes cambiar tu contraseña antes de continuar."
                            type="warning"
                            showIcon
                            style={{ marginBottom: 24, textAlign: 'left' }}
                        />
                    )}
                </div>

                <Form
                    form={form}
                    name="change_password"
                    onFinish={onFinish}
                    layout="vertical"
                >
                    <Form.Item
                        name="current_password"
                        label="Contraseña Actual"
                        rules={[{ required: true, message: 'Ingresa tu contraseña actual' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Contraseña actual" />
                    </Form.Item>

                    <Form.Item
                        name="new_password"
                        label="Nueva Contraseña"
                        rules={[
                            { required: true, message: 'Ingresa la nueva contraseña' },
                            { min: 8, message: 'La contraseña debe tener al menos 8 caracteres' }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Nueva contraseña" />
                    </Form.Item>

                    <Form.Item
                        name="confirm_password"
                        label="Confirmar Nueva Contraseña"
                        dependencies={['new_password']}
                        rules={[{ required: true, message: 'Confirma tu nueva contraseña' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Confirmar contraseña" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            Actualizar Contraseña
                        </Button>
                    </Form.Item>

                    {!user?.must_change_password && (
                        <Button type="link" block onClick={() => navigate(-1)}>
                            Cancelar
                        </Button>
                    )}
                </Form>
            </Card>
        </div>
    );
}
