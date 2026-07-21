import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Button,
    Form,
    Input,
    Modal,
    Select,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { DatabaseOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import { message } from '@shared/services/message';
import useIsMobile from '@shared/hooks/useIsMobile';
import AcervoSectionHeader from '@features/acervo/components/AcervoSectionHeader';
import {
    createBucket,
    getAllBuckets,
    updateBucket,
} from '@features/acervo/api/acervoService';
import { invalidateAccessibleBucketsCache } from '@features/acervo/hooks/useAccessibleBuckets';

const { Text } = Typography;

const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

const backendError = (error, fallback) => {
    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    return fallback;
};

export default function BucketsPage() {
    const { isMobile } = useIsMobile();
    const [buckets, setBuckets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [form] = Form.useForm();

    const projectName = useMemo(() => {
        const map = new Map(projects.map((p) => [p.id, p.name]));
        return (id) => map.get(id) || `#${id}`;
    }, [projects]);

    const reload = useCallback(async () => {
        const data = await getAllBuckets();
        setBuckets(Array.isArray(data) ? data : []);
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all([getAllBuckets(), api.get('/projects')])
            .then(([bucketsData, projectsRes]) => {
                if (cancelled) return;
                setBuckets(Array.isArray(bucketsData) ? bucketsData : []);
                setProjects(projectsRes.data || []);
            })
            .catch(() => message.error('Error al cargar buckets'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ is_public: false, is_active: true });
        setModalOpen(true);
    };

    const openEdit = (record) => {
        setEditing(record);
        form.resetFields();
        form.setFieldsValue({
            project_id: record.project_id,
            acervo_bucket: record.acervo_bucket,
            access_key_ref: record.access_key_ref,
            display_name: record.display_name,
            is_public: record.is_public,
            is_active: record.is_active,
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editing) {
                await updateBucket(editing.id, {
                    display_name: values.display_name,
                    is_public: values.is_public,
                    is_active: values.is_active,
                });
                message.success('Bucket actualizado');
            } else {
                await createBucket({
                    project_id: values.project_id,
                    acervo_bucket: values.acervo_bucket,
                    access_key_ref: values.access_key_ref,
                    display_name: values.display_name,
                    is_public: values.is_public,
                    is_active: values.is_active,
                });
                message.success('Bucket creado');
            }
            setModalOpen(false);
            invalidateAccessibleBucketsCache();
            await reload();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(backendError(err, 'Error al guardar el bucket'));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (record, value) => {
        setTogglingId(record.id);
        try {
            await updateBucket(record.id, { is_active: value });
            invalidateAccessibleBucketsCache();
            await reload();
        } catch (err) {
            message.error(backendError(err, 'Error al actualizar el bucket'));
        } finally {
            setTogglingId(null);
        }
    };

    const columns = [
        {
            title: 'Nombre visible',
            dataIndex: 'display_name',
            key: 'display_name',
            render: (value) => <Text strong>{value}</Text>,
        },
        {
            title: 'Bucket',
            dataIndex: 'acervo_bucket',
            key: 'acervo_bucket',
            render: (value) => <Text code>{value}</Text>,
        },
        {
            title: 'Proyecto',
            dataIndex: 'project_id',
            key: 'project_id',
            render: (value) => projectName(value),
        },
        {
            title: 'Visibilidad',
            dataIndex: 'is_public',
            key: 'is_public',
            render: (value) => (
                <Tag color={value ? 'green' : 'default'}>{value ? 'Público' : 'Privado'}</Tag>
            ),
        },
        {
            title: 'Activo',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (value, record) => (
                <Switch
                    checked={value}
                    loading={togglingId === record.id}
                    onChange={(checked) => handleToggleActive(record, checked)}
                />
            ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <Tooltip title="Editar">
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'flex-start',
                gap: 12,
                marginBottom: 16,
            }}>
                <AcervoSectionHeader
                    icon={<DatabaseOutlined />}
                    title="Buckets"
                    description="Registra y administra los buckets del Acervo: proyecto, visibilidad y estado."
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} block={isMobile}>
                    Nuevo bucket
                </Button>
            </div>

            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={buckets}
                pagination={false}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                open={modalOpen}
                title={editing ? 'Editar bucket' : 'Nuevo bucket'}
                okText={editing ? 'Guardar' : 'Crear'}
                cancelText="Cancelar"
                confirmLoading={saving}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item
                        name="project_id"
                        label="Proyecto"
                        rules={[{ required: true, message: 'Selecciona un proyecto' }]}
                    >
                        <Select
                            disabled={!!editing}
                            placeholder="Proyecto al que pertenece"
                            options={projects.map((p) => ({ value: p.id, label: p.name }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="acervo_bucket"
                        label="Bucket (nombre en el almacenamiento)"
                        rules={editing ? [] : [
                            { required: true, message: 'Ingresa el nombre del bucket' },
                            {
                                pattern: BUCKET_NAME_PATTERN,
                                message: 'Solo minúsculas, números, puntos y guiones (3-63)',
                            },
                        ]}
                        extra={editing ? 'El nombre del bucket no puede cambiarse.' : undefined}
                    >
                        <Input disabled={!!editing} placeholder="p. ej. mariachi" />
                    </Form.Item>

                    <Form.Item
                        name="access_key_ref"
                        label="Prefijo de credencial"
                        rules={editing ? [] : [{ required: true, message: 'Ingresa el prefijo de credencial' }]}
                        extra={editing
                            ? 'El prefijo de credencial no puede cambiarse.'
                            : 'Prefijo de la credencial en el .env, p. ej. ACERVO_MARIACHI (se leen ACERVO_MARIACHI_ACCESS_KEY / _SECRET_KEY).'}
                    >
                        <Input disabled={!!editing} placeholder="p. ej. ACERVO_MARIACHI" />
                    </Form.Item>

                    <Form.Item
                        name="display_name"
                        label="Nombre visible"
                        rules={[{ required: true, message: 'Ingresa un nombre visible' }]}
                    >
                        <Input placeholder="Nombre mostrado en la UI" />
                    </Form.Item>

                    <Form.Item name="is_public" label="Público" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Form.Item name="is_active" label="Activo" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
