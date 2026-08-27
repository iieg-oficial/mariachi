import { useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Form,
    Layout,
    Popconfirm,
    Space,
    Spin,
    Switch,
    Table,
    Tag,
    Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useReporteTipos } from '@features/colibri/hooks/useReporteTipos';
import {
    actualizarTipo,
    crearTipo,
    eliminarTipo,
} from '@features/colibri/api/tiposService';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import TipoFormDrawer from '@features/colibri/components/TipoFormDrawer';

const { Content } = Layout;
const { Title, Text } = Typography;

function slugify(value) {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50);
}


export default function TiposPage() {
    const { isMobile } = useIsMobile();
    const { tipos, loading, error, reload } = useReporteTipos();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [actingId, setActingId] = useState(null);
    const [form] = Form.useForm();

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            activo: true,
            color: 'default',
            orden: tipos.length + 1,
            form_schema: { campos: [] },
        });
        setDrawerOpen(true);
    };

    const openEdit = (record) => {
        setEditing(record);
        form.setFieldsValue({
            label: record.label,
            slug: record.slug,
            color: record.color,
            icon: record.icon,
            descripcion: record.descripcion,
            activo: record.activo,
            orden: record.orden,
            form_schema: record.formSchema || { campos: [] },
        });
        setDrawerOpen(true);
    };

    const handleLabelChange = (e) => {
        if (editing) return;
        const next = slugify(e.target.value);
        form.setFieldsValue({ slug: next });
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editing) {
                const { slug: _slug, ...rest } = values;
                await actualizarTipo(editing.id, rest);
                message.success('Tipo actualizado');
            } else {
                await crearTipo(values);
                message.success('Tipo creado');
            }
            setDrawerOpen(false);
            await reload();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err?.response?.data?.detail || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActivo = async (record, value) => {
        setActingId(record.id);
        try {
            await actualizarTipo(record.id, { activo: value });
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al actualizar');
        } finally {
            setActingId(null);
        }
    };

    const handleDelete = async (record) => {
        setActingId(record.id);
        try {
            await eliminarTipo(record.id);
            message.success(`Tipo "${record.label}" eliminado`);
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
        } finally {
            setActingId(null);
        }
    };

    const columns = [
        { title: 'Orden', dataIndex: 'orden', width: 80, sorter: (a, b) => a.orden - b.orden, defaultSortOrder: 'ascend' },
        {
            title: 'Etiqueta',
            dataIndex: 'label',
            render: (label, record) => (
                <Tag color={record.color}>{label}</Tag>
            ),
        },
        { title: 'Slug', dataIndex: 'slug', responsive: ['md'], render: (s) => <Text code>{s}</Text> },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            responsive: ['lg'],
            render: (text) => (
                <Text type="secondary" ellipsis={{ tooltip: text }} style={{ maxWidth: 320, display: 'block' }}>
                    {text || '—'}
                </Text>
            ),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            width: 90,
            render: (value, record) => (
                <Switch
                    checked={value}
                    loading={actingId === record.id}
                    onChange={(checked) => handleToggleActivo(record, checked)}
                />
            ),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 130,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    <Popconfirm
                        title="¿Eliminar tipo?"
                        description="Solo se puede eliminar si ningún reporte usa este tipo."
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(record)}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />} loading={actingId === record.id} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Tipos de reporte</Title>
                    <Text type="secondary">
                        Catálogo de razones por las que un usuario puede reportar (problema, solicitud, etc.).
                    </Text>
                </div>

                {error && <Alert type="error" title={error} showIcon closable />}

                <Card>
                    <Space style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            Nuevo tipo
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={reload}>Refrescar</Button>
                    </Space>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : (
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={tipos}
                            pagination={false}
                            size={isMobile ? 'small' : 'middle'}
                            scroll={{ x: 'max-content' }}
                        />
                    )}
                </Card>
            </Space>

            <TipoFormDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onSubmit={handleSubmit}
                saving={saving}
                editing={editing}
                form={form}
                isMobile={isMobile}
                onLabelChange={handleLabelChange}
            />
        </Content>
    );
}
