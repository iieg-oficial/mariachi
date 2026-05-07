import { useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Drawer,
    Form,
    Input,
    InputNumber,
    Layout,
    Popconfirm,
    Select,
    Space,
    Spin,
    Switch,
    Table,
    Tabs,
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
import FormSchemaEditor from '@features/colibri/components/FormSchemaEditor';

const { Content } = Layout;
const { Title, Text } = Typography;

const COLOR_OPTIONS = [
    'red', 'volcano', 'orange', 'gold', 'yellow', 'lime', 'green', 'cyan',
    'blue', 'geekblue', 'purple', 'magenta', 'default',
];

function slugify(value) {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50);
}

function FormSchemaInput({ value, onChange }) {
    return (
        <FormSchemaEditor
            value={value || { campos: [] }}
            onChange={(next) => onChange?.(next)}
        />
    );
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
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Tipos de reporte</Title>
                    <Text type="secondary">
                        Catálogo de razones por las que un usuario puede reportar (problema, solicitud, etc.).
                    </Text>
                </div>

                {error && <Alert type="error" message={error} showIcon closable />}

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

            <Drawer
                title={editing ? `Editar tipo: ${editing.label}` : 'Nuevo tipo'}
                open={drawerOpen}
                width={isMobile ? '100%' : 640}
                onClose={() => setDrawerOpen(false)}
                destroyOnClose
                extra={
                    <Space>
                        <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                        <Button type="primary" loading={saving} onClick={handleSubmit}>
                            Guardar
                        </Button>
                    </Space>
                }
            >
                <Form form={form} layout="vertical">
                    <Tabs
                        defaultActiveKey="general"
                        items={[
                            {
                                key: 'general',
                                label: 'General',
                                forceRender: true,
                                children: (
                                    <>
                                        <Form.Item
                                            name="label"
                                            label="Etiqueta visible"
                                            rules={[{ required: true, message: 'Requerido' }, { max: 100 }]}
                                        >
                                            <Input placeholder="Ej. Datos incorrectos" onChange={handleLabelChange} />
                                        </Form.Item>
                                        <Form.Item
                                            name="slug"
                                            label="Slug (identificador interno)"
                                            tooltip="Solo minúsculas, números y _. No se puede cambiar después de crear."
                                            rules={[
                                                { required: true, message: 'Requerido' },
                                                { pattern: /^[a-z0-9_]+$/, message: 'Solo a-z, 0-9 y _' },
                                            ]}
                                        >
                                            <Input placeholder="datos_incorrectos" disabled={Boolean(editing)} />
                                        </Form.Item>
                                        <Form.Item name="color" label="Color del Tag" rules={[{ required: true }]}>
                                            <Select
                                                options={COLOR_OPTIONS.map((c) => ({
                                                    value: c,
                                                    label: <Tag color={c}>{c}</Tag>,
                                                }))}
                                            />
                                        </Form.Item>
                                        <Form.Item name="icon" label="Icono (opcional)" tooltip="Slug del icono — uso futuro en widget">
                                            <Input placeholder="bug, flag, bulb…" />
                                        </Form.Item>
                                        <Form.Item name="descripcion" label="Descripción">
                                            <Input.TextArea rows={3} placeholder="Cuándo usar este tipo. Se mostrará al usuario al elegir." />
                                        </Form.Item>
                                        <Form.Item name="orden" label="Orden" rules={[{ required: true }]}>
                                            <InputNumber min={0} style={{ width: 120 }} />
                                        </Form.Item>
                                        <Form.Item name="activo" label="Activo" valuePropName="checked">
                                            <Switch />
                                        </Form.Item>
                                    </>
                                ),
                            },
                            {
                                key: 'formulario',
                                label: 'Formulario',
                                forceRender: true,
                                children: (
                                    <Form.Item name="form_schema" noStyle>
                                        <FormSchemaInput />
                                    </Form.Item>
                                ),
                            },
                        ]}
                    />
                </Form>
            </Drawer>
        </Content>
    );
}
