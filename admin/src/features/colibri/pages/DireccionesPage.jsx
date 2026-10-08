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
    Space,
    Spin,
    Switch,
    Table,
    Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useDirecciones } from '@features/colibri/hooks/useDirecciones';
import {
    actualizarDireccion,
    crearDireccion,
    eliminarDireccion,
} from '@features/colibri/api/direccionesService';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Title, Text } = Typography;


export default function DireccionesPage() {
    const { isMobile } = useIsMobile();
    const { direcciones, loading, error, reload } = useDirecciones();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [actingId, setActingId] = useState(null);
    const [form] = Form.useForm();

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ activo: true, orden: direcciones.length + 1 });
        setDrawerOpen(true);
    };

    const openEdit = (record) => {
        setEditing(record);
        form.setFieldsValue({
            nombre: record.nombre,
            siglas: record.siglas,
            descripcion: record.descripcion,
            email_contacto: record.emailContacto,
            responsable_nombre: record.responsableNombre,
            activo: record.activo,
            orden: record.orden,
        });
        setDrawerOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editing) {
                await actualizarDireccion(editing.id, values);
                message.success('Dirección actualizada');
            } else {
                await crearDireccion(values);
                message.success('Dirección creada');
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
            await actualizarDireccion(record.id, { activo: value });
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
            await eliminarDireccion(record.id);
            message.success(`Dirección "${record.nombre}" eliminada`);
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
        } finally {
            setActingId(null);
        }
    };

    const columns = [
        { title: 'Orden', dataIndex: 'orden', width: 80, sorter: (a, b) => a.orden - b.orden, defaultSortOrder: 'ascend' },
        { title: 'Nombre', dataIndex: 'nombre' },
        { title: 'Siglas', dataIndex: 'siglas', width: 110, responsive: ['md'], render: (s) => s ? <Text code>{s}</Text> : <Text type="secondary">—</Text> },
        {
            title: 'Contacto',
            dataIndex: 'emailContacto',
            responsive: ['lg'],
            render: (email, record) => (
                <Space orientation="vertical" size={0}>
                    {record.responsableNombre && <Text>{record.responsableNombre}</Text>}
                    {email ? <Text copyable type="secondary" style={{ fontSize: 12 }}>{email}</Text> : <Text type="secondary">—</Text>}
                </Space>
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
                        title="¿Eliminar dirección?"
                        description="Solo se puede eliminar si ningún reporte la referencia."
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
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Direcciones organizacionales</Title>
                    <Text type="secondary">
                        Áreas internas del IIEG a las que se pueden rutear solicitudes y reportes.
                    </Text>
                </div>

                {error && <Alert type="error" title={error} showIcon closable />}

                <Card>
                    <Space style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            Nueva dirección
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={reload}>Refrescar</Button>
                    </Space>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : (
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={direcciones}
                            pagination={false}
                            size={isMobile ? 'small' : 'middle'}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: 'Sin direcciones registradas. Crea la primera con el botón "Nueva dirección".' }}
                        />
                    )}
                </Card>
            </Space>

            <Drawer
                title={editing ? `Editar: ${editing.nombre}` : 'Nueva dirección'}
                open={drawerOpen}
                size={isMobile ? '100%' : 480}
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
                    <Form.Item
                        name="nombre"
                        label="Nombre"
                        rules={[{ required: true, message: 'Requerido' }, { max: 200 }]}
                    >
                        <Input placeholder="Dirección de Análisis Estadístico" />
                    </Form.Item>
                    <Form.Item name="siglas" label="Siglas" rules={[{ max: 20 }]}>
                        <Input placeholder="DAE" />
                    </Form.Item>
                    <Form.Item name="descripcion" label="Descripción">
                        <Input.TextArea rows={3} placeholder="A qué se dedica esta dirección, qué tipos de reporte le competen…" />
                    </Form.Item>
                    <Form.Item
                        name="email_contacto"
                        label="Email de contacto"
                        rules={[{ type: 'email', message: 'Email inválido' }]}
                    >
                        <Input placeholder="dae@iieg.gob.mx" />
                    </Form.Item>
                    <Form.Item name="responsable_nombre" label="Responsable" rules={[{ max: 200 }]}>
                        <Input placeholder="Nombre del titular" />
                    </Form.Item>
                    <Form.Item name="orden" label="Orden" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item name="activo" label="Activa" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Drawer>
        </Content>
    );
}
