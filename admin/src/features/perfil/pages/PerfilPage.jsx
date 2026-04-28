import { useEffect, useState } from 'react';
import { Layout, Card, Form, Input, Button, Avatar, Space, Typography, Tag, Divider } from 'antd';
import { UserOutlined, SaveOutlined, FileImageOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import { BucketFilePicker } from '@features/media';
import { message } from '@shared/services/message';
import api from '@shared/services/api';
import { actualizarPerfil } from '@features/perfil/api/perfilService';

const { Content } = Layout;
const { Title, Text } = Typography;

const PORTAL_BUCKET_SLUG = 'portal';


export default function PerfilPage() {
    const { user, refreshUser } = useAuth();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [bucketId, setBucketId] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || user?.avatar_url || '');

    useEffect(() => {
        let cancelled = false;
        api.get('/media-buckets')
            .then((res) => {
                if (cancelled) return;
                const portal = res.data.find((b) => b.acervo_bucket === PORTAL_BUCKET_SLUG);
                if (portal) setBucketId(portal.id);
                else if (res.data.length > 0) setBucketId(res.data[0].id);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        form.setFieldsValue({
            name: user?.name || '',
            email: user?.email || '',
        });
        setAvatarUrl(user?.avatarUrl || user?.avatar_url || '');
    }, [user, form]);

    const onSelectAvatar = (file) => {
        if (file?.url) setAvatarUrl(file.url);
        setPickerOpen(false);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await actualizarPerfil({
                ...values,
                avatar_url: avatarUrl || null,
            });
            if (typeof refreshUser === 'function') await refreshUser();
            message.success('Perfil actualizado');
        } catch (err) {
            if (err?.errorFields) message.error('Revisa los campos marcados');
            else message.error(err?.response?.data?.detail || 'Error al actualizar perfil');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Content style={{ padding: 24, maxWidth: 720, margin: '0 auto', width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>Perfil</Title>
                    <Text type="secondary">Edita tu información personal y avatar.</Text>
                </div>

                <Card>
                    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                        <Space size="large" align="center">
                            <Avatar
                                size={96}
                                src={avatarUrl || undefined}
                                icon={!avatarUrl && <UserOutlined />}
                            />
                            <Space orientation="vertical" size={4}>
                                <Button
                                    icon={<FileImageOutlined />}
                                    disabled={!bucketId}
                                    onClick={() => setPickerOpen(true)}
                                >
                                    Cambiar avatar
                                </Button>
                                {avatarUrl && (
                                    <Button type="link" size="small" onClick={() => setAvatarUrl('')}>
                                        Quitar avatar
                                    </Button>
                                )}
                            </Space>
                        </Space>

                        <Divider style={{ margin: '8px 0' }} />

                        <Form form={form} layout="vertical">
                            <Form.Item
                                label="Nombre"
                                name="name"
                                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
                            >
                                <Input placeholder="Tu nombre" />
                            </Form.Item>

                            <Form.Item
                                label="Email"
                                name="email"
                                rules={[
                                    { required: true, message: 'El email es obligatorio' },
                                    { type: 'email', message: 'Email inválido' },
                                ]}
                            >
                                <Input placeholder="tu@email.com" />
                            </Form.Item>
                        </Form>

                        <Space orientation="vertical" size={4}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Usuario: <Text code>{user?.username}</Text> · Rol: <Tag>{user?.role}</Tag>
                            </Text>
                        </Space>

                        <div style={{ textAlign: 'right' }}>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={saving}
                                onClick={handleSave}
                            >
                                Guardar cambios
                            </Button>
                        </div>
                    </Space>
                </Card>
            </Space>

            <BucketFilePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={onSelectAvatar}
                bucketId={bucketId}
                title="Elegir avatar"
            />
        </Content>
    );
}
