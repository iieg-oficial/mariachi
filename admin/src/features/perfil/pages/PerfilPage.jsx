import { useEffect, useState } from 'react';
import { Layout, Card, Form, Input, Button, Avatar, Space, Typography, Tag, Divider, Upload } from 'antd';
import { UserOutlined, SaveOutlined, FileImageOutlined, UploadOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import { BucketFilePicker, useAccessibleBuckets } from '@features/acervo';
import { message } from '@shared/services/message';
import { actualizarPerfil, subirAvatar } from '@features/perfil/api/perfilService';

const { Content } = Layout;
const { Title, Text } = Typography;

const GENERIC_BUCKET_SLUGS = ['iieg'];
const GENERIC_PREFIX = 'avatars/';

export default function PerfilPage() {
    const { user, refreshUser } = useAuth();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const { buckets: genericBuckets } = useAccessibleBuckets(GENERIC_BUCKET_SLUGS);
    const genericBucketId = genericBuckets[0]?.id ?? null;
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || user?.avatar_url || '');

    useEffect(() => {
        form.setFieldsValue({
            name: user?.name || '',
            email: user?.email || '',
        });
        setAvatarUrl(user?.avatarUrl || user?.avatar_url || '');
    }, [user, form]);

    const onSelectGeneric = (file) => {
        if (file?.url) setAvatarUrl(file.url);
        setPickerOpen(false);
    };

    const onCustomUpload = async ({ file, onSuccess, onError }) => {
        try {
            setUploading(true);
            const result = await subirAvatar(file);
            if (result?.avatarUrl || result?.avatar_url) {
                setAvatarUrl(result.avatarUrl || result.avatar_url);
            }
            if (typeof refreshUser === 'function') await refreshUser();
            message.success('Avatar subido');
            onSuccess?.(result);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al subir avatar');
            onError?.(err);
        } finally {
            setUploading(false);
        }
    };

    const beforeUpload = (file) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.type)) {
            message.error('Solo JPG, PNG, WebP o GIF');
            return Upload.LIST_IGNORE;
        }
        const maxBytes = 2 * 1024 * 1024;
        if (file.size > maxBytes) {
            message.error('La imagen debe pesar menos de 2 MB');
            return Upload.LIST_IGNORE;
        }
        return true;
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
                        <Space size="large" align="center" wrap>
                            <Avatar
                                size={96}
                                src={avatarUrl || undefined}
                                icon={!avatarUrl && <UserOutlined />}
                            />
                            <Space orientation="vertical" size={8}>
                                <Space size={8} wrap>
                                    <Button
                                        icon={<FileImageOutlined />}
                                        disabled={!genericBucketId}
                                        onClick={() => setPickerOpen(true)}
                                    >
                                        Elegir genérico
                                    </Button>
                                    <Upload
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        showUploadList={false}
                                        beforeUpload={beforeUpload}
                                        customRequest={onCustomUpload}
                                    >
                                        <Button
                                            icon={<UploadOutlined />}
                                            loading={uploading}
                                        >
                                            Subir personalizado
                                        </Button>
                                    </Upload>
                                </Space>
                                {avatarUrl && (
                                    <Button type="link" size="small" onClick={() => setAvatarUrl('')}>
                                        Quitar avatar
                                    </Button>
                                )}
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    Avatares se almacenan en el bucket público compartido del IIEG (visibles entre productos del ecosistema). JPG/PNG/WebP/GIF, máximo 2 MB.
                                </Text>
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
                onSelect={onSelectGeneric}
                bucketSlugs={GENERIC_BUCKET_SLUGS}
                prefixes={[GENERIC_PREFIX]}
                mode="grid"
                title="Elegir avatar genérico"
                allowUpload={false}
            />
        </Content>
    );
}
