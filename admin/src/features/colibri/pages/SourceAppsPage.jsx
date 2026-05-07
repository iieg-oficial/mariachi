import { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Drawer,
    Form,
    Input,
    InputNumber,
    Layout,
    Modal,
    Popconfirm,
    Select,
    Space,
    Spin,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    KeyOutlined,
    PlusOutlined,
    ReloadOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    actualizarSourceApp,
    crearSourceApp,
    eliminarSourceApp,
    listSourceApps,
    rotarApiKey,
} from '@features/colibri/api/sourceAppsService';
import { useReporteTipos } from '@features/colibri/hooks/useReporteTipos';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;


export default function SourceAppsPage() {
    const { isMobile } = useIsMobile();
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [actingId, setActingId] = useState(null);
    const [keyModal, setKeyModal] = useState(null);
    const [form] = Form.useForm();
    const { tipos } = useReporteTipos();

    const reload = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listSourceApps();
            setApps(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Error al cargar source apps');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { reload(); }, []);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            activo: false,
            notificar_discord: true,
            rate_limit_per_hour: 60,
            dominios_permitidos: [],
            disable_pii: false,
        });
        setDrawerOpen(true);
    };

    const openEdit = (record) => {
        setEditing(record);
        form.setFieldsValue({
            slug: record.slug,
            nombre: record.nombre,
            descripcion: record.descripcion,
            dominios_permitidos: record.dominiosPermitidos || [],
            tipos_permitidos: record.tiposPermitidos || undefined,
            rate_limit_per_hour: record.rateLimitPerHour,
            notificar_discord: record.notificarDiscord,
            discord_webhook_url: record.discordWebhookUrl,
            disable_pii: record.disablePii ?? false,
            privacy_url: record.privacyUrl,
            scrubbers: record.scrubbers || [],
            activo: record.activo,
        });
        setDrawerOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editing) {
                const { slug: _slug, ...rest } = values;
                await actualizarSourceApp(editing.id, rest);
                message.success('Source app actualizado');
            } else {
                await crearSourceApp(values);
                message.success('Source app creado. Genera una API key para activarlo.');
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

    const handleRotate = async (record, visibility = 'public') => {
        setActingId(record.id);
        try {
            const result = await rotarApiKey(record.id, visibility);
            setKeyModal({ ...result, sourceApp: record });
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al generar API key');
        } finally {
            setActingId(null);
        }
    };

    const handleToggleActivo = async (record, value) => {
        setActingId(record.id);
        try {
            await actualizarSourceApp(record.id, { activo: value });
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al actualizar');
            await reload();
        } finally {
            setActingId(null);
        }
    };

    const handleDelete = async (record) => {
        setActingId(record.id);
        try {
            await eliminarSourceApp(record.id);
            message.success(`Source app "${record.nombre}" eliminado`);
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
        } finally {
            setActingId(null);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(
            () => message.success('Copiado al portapapeles'),
            () => message.error('No se pudo copiar'),
        );
    };

    const columns = [
        {
            title: 'App',
            dataIndex: 'nombre',
            render: (nombre, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{nombre}</Text>
                    <Text code style={{ fontSize: 11 }}>{record.slug}</Text>
                </Space>
            ),
        },
        {
            title: 'API Key',
            dataIndex: 'apiKeyPrefix',
            width: 200,
            render: (prefix, record) => (
                record.hasApiKey ? (
                    <Space direction="vertical" size={0}>
                        <Text code>{prefix}…</Text>
                        <Button
                            size="small"
                            type="link"
                            icon={<KeyOutlined />}
                            onClick={() => handleRotate(record)}
                            style={{ padding: 0, height: 'auto' }}
                        >
                            Rotar
                        </Button>
                    </Space>
                ) : (
                    <Button
                        size="small"
                        type="primary"
                        icon={<KeyOutlined />}
                        loading={actingId === record.id}
                        onClick={() => handleRotate(record)}
                    >
                        Generar key
                    </Button>
                )
            ),
        },
        {
            title: 'Dominios',
            dataIndex: 'dominiosPermitidos',
            responsive: ['md'],
            render: (list) => (
                list?.length ? (
                    <Space wrap size={4}>
                        {list.slice(0, 3).map((d) => <Tag key={d}>{d}</Tag>)}
                        {list.length > 3 && <Tooltip title={list.slice(3).join(', ')}><Tag>+{list.length - 3}</Tag></Tooltip>}
                    </Space>
                ) : <Text type="secondary">—</Text>
            ),
        },
        {
            title: 'Tipos',
            dataIndex: 'tiposPermitidos',
            responsive: ['lg'],
            render: (list) => (
                list?.length ? (
                    <Space wrap size={4}>
                        {list.map((t) => <Tag key={t}>{t}</Tag>)}
                    </Space>
                ) : <Text type="secondary">Todos</Text>
            ),
        },
        {
            title: 'Rate/h',
            dataIndex: 'rateLimitPerHour',
            width: 90,
            responsive: ['lg'],
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            width: 90,
            render: (value, record) => (
                <Switch
                    checked={value}
                    loading={actingId === record.id}
                    disabled={!record.hasApiKey}
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
                        title="¿Eliminar source app?"
                        description="Solo se puede eliminar si ningún reporte lo referencia."
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
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Source apps</Title>
                    <Text type="secondary">
                        Aplicaciones huésped autorizadas a enviar reportes a Colibri. Cada una tiene su propia API key, dominios permitidos y rate limit.
                    </Text>
                </div>

                {error && <Alert type="error" message={error} showIcon closable />}

                <Card>
                    <Space style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            Nuevo source app
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={reload}>Refrescar</Button>
                    </Space>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : (
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={apps}
                            pagination={false}
                            size={isMobile ? 'small' : 'middle'}
                            scroll={{ x: 'max-content' }}
                        />
                    )}
                </Card>
            </Space>

            <Drawer
                title={editing ? `Editar: ${editing.nombre}` : 'Nuevo source app'}
                open={drawerOpen}
                width={isMobile ? '100%' : 520}
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
                        name="slug"
                        label="Slug"
                        rules={[
                            { required: true, message: 'Requerido' },
                            { pattern: /^[a-z0-9_-]+$/, message: 'Solo a-z, 0-9, _, -' },
                        ]}
                        tooltip="Identificador interno. Va en source_app del reporte. No se puede cambiar después."
                    >
                        <Input placeholder="mi-app" disabled={Boolean(editing)} />
                    </Form.Item>
                    <Form.Item
                        name="nombre"
                        label="Nombre visible"
                        rules={[{ required: true }, { max: 150 }]}
                    >
                        <Input placeholder="Mi App" />
                    </Form.Item>
                    <Form.Item name="descripcion" label="Descripción">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item
                        name="dominios_permitidos"
                        label="Dominios permitidos (CORS)"
                        tooltip="Origins autorizados a usar la API key pública. Soporta wildcards: *.iieg.gob.mx o * para todos. Vacío = ningún dominio (key inutilizable)."
                    >
                        <Select
                            mode="tags"
                            placeholder="https://app.iieg.gob.mx, *.iieg.gob.mx, *"
                            tokenSeparators={[',', ' ']}
                        />
                    </Form.Item>
                    <Form.Item
                        name="tipos_permitidos"
                        label="Tipos permitidos"
                        tooltip="Si vacío, se permiten todos los tipos activos."
                    >
                        <Select
                            mode="multiple"
                            allowClear
                            placeholder="Todos los tipos"
                            options={tipos.map((t) => ({ value: t.slug, label: t.label }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="rate_limit_per_hour"
                        label="Rate limit (peticiones/hora por IP)"
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={1} max={10000} style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item name="notificar_discord" label="Notificar a Discord" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item name="discord_webhook_url" label="Webhook Discord (override opcional)">
                        <Input placeholder="https://discord.com/api/webhooks/…" />
                    </Form.Item>
                    <Form.Item
                        name="disable_pii"
                        label="Modo sin PII"
                        valuePropName="checked"
                        tooltip="Si se activa, el backend purga UA, viewport, identify, breadcrumbs y email_contacto antes de persistir. Útil para huéspedes con políticas estrictas de privacidad."
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item
                        name="privacy_url"
                        label="URL del aviso de privacidad"
                        tooltip="Mostrada al usuario cuando se requiera consentimiento explícito."
                        rules={[{ max: 500 }]}
                    >
                        <Input placeholder="https://iieg.gob.mx/aviso-privacidad" />
                    </Form.Item>
                    <Form.Item
                        label="Scrubbers personalizados"
                        tooltip="Patrones regex extra para anonimizar campos sensibles antes de persistir. Los defaults (JWT, tokens, CCN) ya están aplicados."
                    >
                        <Form.List name="scrubbers">
                            {(fields, { add, remove }) => (
                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                    {fields.map((field) => (
                                        <Space.Compact key={field.key} style={{ width: '100%' }}>
                                            <Form.Item name={[field.name, 'pattern']} noStyle>
                                                <Input placeholder="Regex (ej. \\bSESSION-\\w+\\b)" />
                                            </Form.Item>
                                            <Form.Item name={[field.name, 'replacement']} noStyle>
                                                <Input placeholder="[REDACTED]" style={{ maxWidth: 160 }} />
                                            </Form.Item>
                                            <Button danger onClick={() => remove(field.name)}>×</Button>
                                        </Space.Compact>
                                    ))}
                                    <Button type="dashed" onClick={() => add({ pattern: '', replacement: '[REDACTED]' })} block>
                                        + Agregar scrubber
                                    </Button>
                                </Space>
                            )}
                        </Form.List>
                    </Form.Item>
                    <Form.Item name="activo" label="Activo" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Drawer>

            <Modal
                open={Boolean(keyModal)}
                onCancel={() => setKeyModal(null)}
                onOk={() => setKeyModal(null)}
                okText="Entendido, ya la copié"
                cancelButtonProps={{ style: { display: 'none' } }}
                title={
                    <Space>
                        <WarningOutlined style={{ color: '#faad14' }} />
                        <span>Nueva API key generada</span>
                    </Space>
                }
                width={560}
                maskClosable={false}
            >
                {keyModal && (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Alert
                            type="warning"
                            showIcon
                            message="Esta clave NO se mostrará otra vez."
                            description="Cópiala ahora y guárdala en un lugar seguro. Si la pierdes, tendrás que rotarla y actualizar todos los huéspedes."
                        />
                        <div>
                            <Text strong>Source app:</Text>{' '}
                            <Text>{keyModal.sourceApp?.nombre} ({keyModal.sourceApp?.slug})</Text>
                        </div>
                        <div>
                            <Text strong>Visibilidad:</Text>{' '}
                            <Tag color={keyModal.visibility === 'public' ? 'blue' : 'red'}>
                                {keyModal.visibility === 'public' ? 'Pública (browser)' : 'Privada (server)'}
                            </Tag>
                        </div>
                        <div>
                            <Text strong>API key:</Text>
                            <Paragraph
                                copyable={{ text: keyModal.plainKey, tooltips: 'Copiar key' }}
                                style={{
                                    background: '#f5f5f5',
                                    padding: 12,
                                    borderRadius: 6,
                                    fontFamily: 'monospace',
                                    fontSize: 13,
                                    wordBreak: 'break-all',
                                    marginTop: 8,
                                    marginBottom: 0,
                                }}
                            >
                                {keyModal.plainKey}
                            </Paragraph>
                        </div>
                        <Button
                            type="primary"
                            icon={<CopyOutlined />}
                            block
                            onClick={() => copyToClipboard(keyModal.plainKey)}
                        >
                            Copiar API key
                        </Button>
                    </Space>
                )}
            </Modal>
        </Content>
    );
}
