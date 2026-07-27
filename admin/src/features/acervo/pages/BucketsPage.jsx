import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Button,
    Form,
    Modal,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { DatabaseOutlined, EditOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import { message } from '@shared/services/message';
import useIsMobile from '@shared/hooks/useIsMobile';
import AcervoSectionHeader from '@features/acervo/components/AcervoSectionHeader';
import BucketFormModal from '@features/acervo/components/BucketFormModal';
import {
    createBucket,
    getAllBuckets,
    updateBucket,
} from '@features/acervo/api/acervoService';
import { invalidateAccessibleBucketsCache } from '@features/acervo/hooks/useAccessibleBuckets';

const { Text } = Typography;

const PROTEGIDO_AYUDA = 'El contenido lo gestiona la aplicación que lo usa y sus rutas están '
    + 'referenciadas desde la base de datos. Con esto activo, el explorador oculta borrar, mover, '
    + 'renombrar y subir, y el API los rechaza aunque se llamen directo.';

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
        form.setFieldsValue({ is_public: false, is_active: true, protegido: false });
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
            protegido: record.protegido,
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
                    protegido: values.protegido,
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
                    protegido: values.protegido,
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

    const aplicarProtegido = async (record, value) => {
        setTogglingId(record.id);
        try {
            await updateBucket(record.id, { protegido: value });
            invalidateAccessibleBucketsCache();
            await reload();
        } catch (err) {
            message.error(backendError(err, 'Error al actualizar el bucket'));
        } finally {
            setTogglingId(null);
        }
    };

    const handleToggleProtegido = (record, value) => {
        if (value) {
            aplicarProtegido(record, true);
            return;
        }
        Modal.confirm({
            title: `¿Desproteger «${record.display_name}»?`,
            content: 'Volverán a habilitarse borrar, mover, renombrar y subir desde el explorador. '
                + 'Si otra aplicación gestiona este contenido y guarda las rutas en la base de datos, '
                + 'un cambio a mano dejará registros apuntando a archivos inexistentes.',
            okText: 'Desproteger',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => aplicarProtegido(record, false),
        });
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
            title: (
                <Tooltip title={PROTEGIDO_AYUDA}>
                    <span>Protegido <LockOutlined /></span>
                </Tooltip>
            ),
            dataIndex: 'protegido',
            key: 'protegido',
            render: (value, record) => (
                <Switch
                    checked={value}
                    loading={togglingId === record.id}
                    onChange={(checked) => handleToggleProtegido(record, checked)}
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

            <BucketFormModal
                open={modalOpen}
                editing={editing}
                projects={projects}
                form={form}
                saving={saving}
                protegidoAyuda={PROTEGIDO_AYUDA}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
            />
        </div>
    );
}
