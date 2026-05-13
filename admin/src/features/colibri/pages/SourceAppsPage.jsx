import { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Form,
    Layout,
    Space,
    Spin,
    Table,
    Typography,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
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
import SourceAppFormDrawer from '@features/colibri/components/SourceAppFormDrawer';
import ApiKeyRevealModal from '@features/colibri/components/ApiKeyRevealModal';
import { buildSourceAppsColumns } from '@features/colibri/components/sourceAppsTableColumns';

const { Content } = Layout;
const { Title, Text } = Typography;


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

    const columns = buildSourceAppsColumns({
        actingId,
        onRotate: handleRotate,
        onToggleActivo: handleToggleActivo,
        onEdit: openEdit,
        onDelete: handleDelete,
    });

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

            <SourceAppFormDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onSubmit={handleSubmit}
                saving={saving}
                editing={editing}
                form={form}
                isMobile={isMobile}
                tipos={tipos}
            />

            <ApiKeyRevealModal
                keyData={keyModal}
                onClose={() => setKeyModal(null)}
                onCopy={copyToClipboard}
            />
        </Content>
    );
}
