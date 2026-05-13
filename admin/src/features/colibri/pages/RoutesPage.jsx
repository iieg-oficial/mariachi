import { useEffect, useState } from 'react';
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
import {
    actualizarRoute,
    crearRoute,
    eliminarRoute,
    listRoutes,
} from '@features/colibri/api/routesService';
import { listSourceApps } from '@features/colibri/api/sourceAppsService';
import { useReporteTipos } from '@features/colibri/hooks/useReporteTipos';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import RouteFormDrawer from '@features/colibri/components/RouteFormDrawer';

const { Content } = Layout;
const { Title, Text } = Typography;

const DESTINO_COLORS = {
    discord: 'purple',
    slack: 'green',
    webhook: 'blue',
    email: 'orange',
};


export default function RoutesPage() {
    const { isMobile } = useIsMobile();
    const [routes, setRoutes] = useState([]);
    const [sourceApps, setSourceApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [actingId, setActingId] = useState(null);
    const [form] = Form.useForm();
    const destino = Form.useWatch('destino', form);
    const { tipos } = useReporteTipos();

    const reload = async () => {
        setLoading(true);
        setError(null);
        try {
            const [r, sa] = await Promise.all([listRoutes(), listSourceApps()]);
            setRoutes(Array.isArray(r) ? r : []);
            setSourceApps(Array.isArray(sa) ? sa : []);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Error al cargar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { reload(); }, []);

    const sourceAppLabel = (id) => {
        if (id == null) return <Tag>todas</Tag>;
        const sa = sourceApps.find((s) => s.id === id);
        return sa ? <Tag color="blue">{sa.slug}</Tag> : <Tag color="red">id={id}</Tag>;
    };

    const tipoLabel = (id) => {
        if (id == null) return <Tag>todos</Tag>;
        const t = tipos.find((x) => x.id === id);
        return t ? <Tag color={t.color}>{t.label}</Tag> : <Tag>id={id}</Tag>;
    };

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            activo: true,
            orden: routes.length + 1,
            destino: 'discord',
        });
        setDrawerOpen(true);
    };

    const openEdit = (record) => {
        setEditing(record);
        form.setFieldsValue({
            nombre: record.nombre,
            source_app_id: record.sourceAppId,
            tipo_id: record.tipoId,
            destino: record.destino,
            url: record.config?.url,
            to: record.config?.to,
            filtros_estados: record.filtros?.estados,
            filtros_tipos: record.filtros?.tipos,
            activo: record.activo,
            orden: record.orden,
        });
        setDrawerOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const config = {};
            if (values.destino === 'email') config.to = values.to;
            else config.url = values.url;
            const filtros = {};
            if (values.filtros_estados?.length) filtros.estados = values.filtros_estados;
            if (values.filtros_tipos?.length) filtros.tipos = values.filtros_tipos;

            const payload = {
                nombre: values.nombre,
                source_app_id: values.source_app_id ?? null,
                tipo_id: values.tipo_id ?? null,
                destino: values.destino,
                config,
                filtros: Object.keys(filtros).length ? filtros : null,
                activo: values.activo,
                orden: values.orden,
            };

            setSaving(true);
            if (editing) {
                await actualizarRoute(editing.id, payload);
                message.success('Route actualizada');
            } else {
                await crearRoute(payload);
                message.success('Route creada');
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
            await actualizarRoute(record.id, { activo: value });
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
            await eliminarRoute(record.id);
            message.success(`Route "${record.nombre}" eliminada`);
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
        {
            title: 'Filtro',
            key: 'filtro',
            render: (_, r) => (
                <Space size={4} wrap>
                    {sourceAppLabel(r.sourceAppId)}
                    {tipoLabel(r.tipoId)}
                </Space>
            ),
        },
        {
            title: 'Destino',
            dataIndex: 'destino',
            width: 110,
            render: (d) => <Tag color={DESTINO_COLORS[d]}>{d}</Tag>,
        },
        {
            title: 'URL/To',
            key: 'config',
            responsive: ['md'],
            render: (_, r) => (
                <Text code style={{ fontSize: 11 }} ellipsis={{ tooltip: r.config?.url || r.config?.to }}>
                    {r.config?.url || r.config?.to || '—'}
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
                        title="¿Eliminar route?"
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
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Routes (fan-out)</Title>
                    <Text type="secondary">
                        Reglas de auto-routing: cada reporte puede dispararse a Discord, Slack, webhooks externos o email según source_app y tipo. Best-effort, no bloquea la creación del reporte.
                    </Text>
                </div>

                {error && <Alert type="error" message={error} showIcon closable />}

                <Card>
                    <Space style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            Nueva route
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={reload}>Refrescar</Button>
                    </Space>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : (
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={routes}
                            pagination={false}
                            size={isMobile ? 'small' : 'middle'}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: 'Sin routes configuradas. Cuando crees la primera, los reportes se enviarán automáticamente al destino.' }}
                        />
                    )}
                </Card>
            </Space>

            <RouteFormDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onSubmit={handleSubmit}
                saving={saving}
                editing={editing}
                form={form}
                isMobile={isMobile}
                sourceApps={sourceApps}
                tipos={tipos}
                destino={destino}
            />
        </Content>
    );
}
