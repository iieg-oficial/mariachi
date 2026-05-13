import { useEffect, useState } from 'react';
import { Alert, Button, Card, Collapse, Form, Layout, Space, Spin, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
    actualizarApiKey,
    crearApiKey,
    crearEmbed,
    eliminarApiKey,
    listApiKeys,
    reactivateApiKey,
    revokeApiKey,
    rotarApiKey,
    suspendApiKey,
} from '@features/mapalab-api-keys/api/mapalabApiKeysService';
import ApiKeysTable from '@features/mapalab-api-keys/components/ApiKeysTable';
import ApiKeyEditorForm from '@features/mapalab-api-keys/components/ApiKeyEditorForm';
import ApiKeyInlinePanel from '@features/mapalab-api-keys/components/ApiKeyInlinePanel';
import ApiKeyRevealModal from '@features/mapalab-api-keys/components/ApiKeyRevealModal';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Title, Text } = Typography;


const DEFAULTS = {
    visibility: 'public',
    dominios_permitidos: [],
    ips_permitidas: [],
    capas_permitidas: [],
    cuota_diaria: 10000,
    cuota_mensual: 200000,
    embeds_iniciales: [],
};


export default function MapalabApiKeysPage() {
    const { isMobile } = useIsMobile();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [plainKeyByRow, setPlainKeyByRow] = useState({});
    const [saving, setSaving] = useState(false);
    const [actingId, setActingId] = useState(null);
    const [keyModal, setKeyModal] = useState(null);
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const reload = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listApiKeys();
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Error al cargar las API keys');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { reload(); }, []);

    const openCreate = () => {
        createForm.resetFields();
        createForm.setFieldsValue(DEFAULTS);
        setCreating(true);
    };

    const closeCreate = () => {
        setCreating(false);
        createForm.resetFields();
    };

    const openRow = (record, tab = 'edit') => {
        editForm.setFieldsValue({
            institucion_nombre: record.institucionNombre,
            institucion_email_contacto: record.institucionEmailContacto,
            descripcion: record.descripcion,
            visibility: record.visibility,
            dominios_permitidos: record.dominiosPermitidos || [],
            ips_permitidas: record.ipsPermitidas || [],
            capas_permitidas: record.capasPermitidas || [],
            cuota_diaria: record.cuotaDiaria,
            cuota_mensual: record.cuotaMensual,
            notas_admin: record.notasAdmin,
        });
        setExpanded({ id: record.id, tab });
    };

    const toggleRow = (record, tab) => {
        if (expanded?.id === record.id) {
            if (expanded.tab !== tab) setExpanded({ id: record.id, tab });
            else closeRow();
        } else {
            openRow(record, tab);
        }
    };

    const closeRow = () => {
        setExpanded(null);
        editForm.resetFields();
    };

    const handleCreateSubmit = async () => {
        try {
            const values = await createForm.validateFields();
            const { embeds_iniciales: embedsList, ...rest } = values;
            setSaving(true);
            const result = await crearApiKey(rest);
            const newKey = result.apiKey;
            const shareIds = Array.isArray(embedsList) ? embedsList.map((s) => String(s).trim()).filter(Boolean) : [];
            const failed = [];
            for (const shareId of shareIds) {
                try {
                    await crearEmbed(newKey.id, { shareId });
                } catch (err) {
                    failed.push(`${shareId}: ${err?.response?.data?.detail || err?.message || 'error'}`);
                }
            }
            if (failed.length) {
                message.warning(`Llave creada, pero algunos mapas guardados no se pudieron vincular: ${failed.join('; ')}`);
            } else if (shareIds.length) {
                message.success(`Llave creada y ${shareIds.length} mapa(s) vinculado(s)`);
            }
            setKeyModal({ plainKey: result.plainKey, apiKey: newKey });
            closeCreate();
            await reload();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err?.response?.data?.detail || 'No se pudo crear la llave');
        } finally {
            setSaving(false);
        }
    };

    const handleEditSubmit = async () => {
        try {
            const values = await editForm.validateFields();
            const { visibility: _v, ...rest } = values;
            setSaving(true);
            await actualizarApiKey(expanded.id, rest);
            message.success('Cambios guardados');
            closeRow();
            await reload();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err?.response?.data?.detail || 'No se pudieron guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleRotate = async (record) => {
        setActingId(record.id);
        try {
            const result = await rotarApiKey(record.id);
            setKeyModal({ plainKey: result.plainKey, apiKey: result.apiKey });
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo generar la contraseña nueva');
        } finally {
            setActingId(null);
        }
    };

    const handleAction = async (record, fn, successMsg) => {
        setActingId(record.id);
        try {
            await fn(record.id);
            if (successMsg) message.success(successMsg);
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo completar la acción');
        } finally {
            setActingId(null);
        }
    };

    const handleTryPlayground = (apiKey, plainKey) => {
        setKeyModal(null);
        setPlainKeyByRow((prev) => ({ ...prev, [apiKey.id]: plainKey }));
        try {
            sessionStorage.setItem(`mapalab_plain_${apiKey.id}`, plainKey);
        } catch { /* sessionStorage no disponible */ }
        openRow(apiKey, 'playground');
    };

    const expandable = {
        expandedRowKeys: expanded ? [expanded.id] : [],
        showExpandColumn: false,
        expandedRowRender: (record) => {
            let storedPlain = plainKeyByRow[record.id] || '';
            if (!storedPlain) {
                try {
                    storedPlain = sessionStorage.getItem(`mapalab_plain_${record.id}`) || '';
                } catch { /* ignore */ }
            }
            return (
                <ApiKeyInlinePanel
                    apiKey={record}
                    activeTab={expanded?.tab || 'edit'}
                    onTabChange={(tab) => setExpanded({ id: record.id, tab })}
                    editForm={editForm}
                    saving={saving}
                    onCancel={closeRow}
                    onSubmit={handleEditSubmit}
                    initialPlainKey={storedPlain}
                />
            );
        },
    };

    return (
        <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Llaves para mostrar mapas en otros sitios</Title>
                    <Text type="secondary">
                        Aquí se administran las llaves que entregamos a otras dependencias para que puedan poner el mapa de MapaLab dentro de sus páginas web. Cada llave pertenece a una institución, controla qué capas puede mostrar y en qué sitios.
                    </Text>
                </div>

                {error && <Alert type="error" message={error} showIcon closable />}

                <Card>
                    <Space style={{ marginBottom: 16 }} wrap>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={creating}>
                            Crear nueva llave
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={reload}>Actualizar listado</Button>
                    </Space>

                    {creating && (
                        <Collapse
                            activeKey="new"
                            ghost
                            style={{ marginBottom: 16, background: '#fafafa', borderRadius: 6 }}
                            items={[{
                                key: 'new',
                                label: <Text strong>Nueva llave para una institución</Text>,
                                children: (
                                    <ApiKeyEditorForm
                                        form={createForm}
                                        editing={null}
                                        saving={saving}
                                        onCancel={closeCreate}
                                        onSubmit={handleCreateSubmit}
                                        embedded
                                    />
                                ),
                            }]}
                        />
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : (
                        <ApiKeysTable
                            items={items}
                            isMobile={isMobile}
                            actingId={actingId}
                            expandedRowId={expanded?.id}
                            expandedTab={expanded?.tab}
                            expandable={expandable}
                            onEdit={(r) => toggleRow(r, 'edit')}
                            onPreview={(r) => toggleRow(r, 'playground')}
                            onRotate={handleRotate}
                            onSuspend={(r) => handleAction(r, suspendApiKey, 'Llave pausada temporalmente')}
                            onReactivate={(r) => handleAction(r, reactivateApiKey, 'Llave reactivada')}
                            onRevoke={(r) => handleAction(r, revokeApiKey, 'Llave cancelada permanentemente')}
                            onDelete={(r) => handleAction(r, eliminarApiKey, 'Llave eliminada del listado')}
                        />
                    )}
                </Card>
            </Space>

            <ApiKeyRevealModal
                keyModal={keyModal}
                onClose={() => setKeyModal(null)}
                onTryPlayground={handleTryPlayground}
            />
        </Content>
    );
}
