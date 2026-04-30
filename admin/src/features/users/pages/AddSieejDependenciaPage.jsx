import { useState } from 'react';
import { Form, Input, Button, Typography, Card, Alert, Flex } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import api from '@shared/services/api';
import { message } from '@shared/services/message';

const { Title, Text } = Typography;

export default function AddSieejDependenciaPage() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [created, setCreated] = useState(null);
    const [form] = Form.useForm();

    const onFinish = async (values) => {
        setSubmitting(true);
        try {
            const { data } = await api.post('/usuarios/agregar-dependencia-sieej', values);
            setCreated(data);
            form.resetFields();
        } catch (err) {
            const detail = err.response?.data?.detail;
            const msg = Array.isArray(detail) ? detail.map((d) => d.msg).join(' / ') : detail;
            message.error(msg || 'Error al agregar la dependencia');
        } finally {
            setSubmitting(false);
        }
    };

    const copyTempPassword = async () => {
        if (!created?.temp_password) return;
        try {
            await navigator.clipboard.writeText(created.temp_password);
            message.success('Contraseña temporal copiada al portapapeles');
        } catch {
            message.warning('No se pudo copiar; selecciona el texto manualmente');
        }
    };

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
            <Title level={3}>Agregar dependencia SIEEJ</Title>
            <Text type="secondary">
                Crea una cuenta de tipo externo con acceso al wizard SIEEJ. Se genera una contraseña temporal que la dependencia debe cambiar en el primer login.
            </Text>

            {created ? (
                <Card style={{ marginTop: 24 }}>
                    <Alert closable
                        type="success"
                        showIcon
                        message={`Dependencia ${created.user.username} creada`}
                        description="Comparte estas credenciales por canal seguro. La contraseña temporal solo se muestra una vez."
                        style={{ marginBottom: 16 }}
                    />
                    <Flex vertical gap={8}>
                        <Text><b>Usuario:</b> {created.user.username}</Text>
                        <Text><b>Email:</b> {created.user.email}</Text>
                        <Text><b>Nombre:</b> {created.user.name}</Text>
                        <Text><b>Rol:</b> {created.user.role}</Text>
                        <Text><b>Proyecto:</b> sieej (editor)</Text>
                        <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                            <Text strong>Contraseña temporal:</Text>
                            <Text code copyable={false} style={{ fontSize: 16 }}>{created.temp_password}</Text>
                            <Button size="small" icon={<CopyOutlined />} onClick={copyTempPassword}>Copiar</Button>
                        </Flex>
                    </Flex>
                    <Flex gap={8} style={{ marginTop: 24 }}>
                        <Button onClick={() => setCreated(null)}>Crear otra</Button>
                        <Button type="primary" onClick={() => navigate('/users')}>Volver a usuarios</Button>
                    </Flex>
                </Card>
            ) : (
                <Card style={{ marginTop: 24 }}>
                    <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
                        <Form.Item
                            label="Nombre de usuario"
                            name="username"
                            rules={[
                                { required: true, message: 'Ingresa un nombre de usuario' },
                                { min: 3, max: 50, message: 'Entre 3 y 50 caracteres' },
                            ]}
                        >
                            <Input placeholder="ej. dependencia_x" />
                        </Form.Item>
                        <Form.Item
                            label="Correo electrónico"
                            name="email"
                            rules={[
                                { required: true, message: 'Ingresa un correo' },
                                { type: 'email', message: 'Correo no válido' },
                            ]}
                        >
                            <Input placeholder="contacto@dependencia.gob.mx" />
                        </Form.Item>
                        <Form.Item
                            label="Nombre completo de la dependencia"
                            name="name"
                            rules={[
                                { required: true, message: 'Ingresa el nombre' },
                                { min: 1, max: 100 },
                            ]}
                        >
                            <Input placeholder="ej. Secretaría de Movilidad" />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button type="primary" htmlType="submit" loading={submitting} block>
                                Crear dependencia
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            )}
        </div>
    );
}
