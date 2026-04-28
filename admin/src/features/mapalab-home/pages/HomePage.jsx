import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
    Alert,
    Button,
    Card,
    Form,
    Input,
    Layout,
    Modal,
    Popconfirm,
    Space,
    Spin,
    Tabs,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    CheckOutlined,
    CloseOutlined,
    ReloadOutlined,
    SaveOutlined,
    SendOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import api from '@shared/services/api';
import {
    descartarBorrador,
    listSecciones,
    publicarSeccion,
    saveBorrador,
} from '@features/mapalab-home/api/homeService';
import { SECTION_DEFAULTS, SECTION_KEYS, SECTION_REGISTRY } from '@features/mapalab-home/components/sectionEditors';
import useIsMobile from '@shared/hooks/useIsMobile';
import usePresencia from '@shared/hooks/usePresencia';
import PresenciaIndicator from '@shared/components/PresenciaIndicator';
import useResourceDraft from '@shared/hooks/useResourceDraft';

const { Content } = Layout;
const { Title, Text } = Typography;


function defaultsForKey(key) {
    return SECTION_DEFAULTS[key] || {};
}


function payloadFromResponse(seccion) {
    return seccion?.payloadDraft ?? seccion?.payload_draft ?? {};
}


function SectionTab({ seccion, onUpdated, active, reviewMode = false, borradorId = null, onReviewDone }) {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [acting, setActing] = useState(false);
    const [rechazoModalOpen, setRechazoModalOpen] = useState(false);
    const [rechazoComentario, setRechazoComentario] = useState('');
    const reg = SECTION_REGISTRY[seccion.key];
    const Editor = reg.Editor;
    const editores = usePresencia(`/home/${seccion.key}`, active && !reviewMode);

    const initialValues = { ...defaultsForKey(seccion.key), ...payloadFromResponse(seccion) };
    const updatedAt = seccion.updatedAt ?? seccion.updated_at ?? '';
    const draftSnapshot = JSON.stringify(payloadFromResponse(seccion));

    const draft = useResourceDraft({
        resourceType: 'home_section',
        resourceId: seccion.key,
        enabled: true,
        reviewMode,
        borradorId,
        onApplyDraft: (data) => form.setFieldsValue({ ...defaultsForKey(seccion.key), ...data }),
    });

    useEffect(() => {
        form.resetFields();
        form.setFieldsValue({ ...defaultsForKey(seccion.key), ...payloadFromResponse(seccion) });
    }, [updatedAt, draftSnapshot, seccion.key, form, seccion]);

    const handleValuesChange = () => {
        if (reviewMode) return;
        draft.scheduleAutosave(form.getFieldsValue());
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            draft.cancelAutosave();
            const updated = await saveBorrador(seccion.key, values, updatedAt || undefined);
            await draft.deleteDraft();
            message.success('Borrador guardado');
            onUpdated(updated);
        } catch (err) {
            if (err?.errorFields) message.error('Revisa los campos marcados');
            else if (err?.response?.status === 409) message.error('La sección fue modificada por otra persona. Recarga para ver los cambios.');
            else message.error(err?.response?.data?.detail || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handlePublicar = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            message.error('Revisa los campos marcados');
            return;
        }
        setActing(true);
        try {
            draft.cancelAutosave();
            await saveBorrador(seccion.key, values, updatedAt || undefined);
            const updated = await publicarSeccion(seccion.key);
            await draft.deleteDraft();
            message.success(`Sección "${reg.label}" publicada`);
            onUpdated(updated);
        } catch (err) {
            if (err?.response?.status === 409) message.error('La sección fue modificada por otra persona. Recarga para ver los cambios.');
            else message.error(err?.response?.data?.detail || 'Error al publicar');
        } finally {
            setActing(false);
        }
    };

    const handleDescartar = async () => {
        setActing(true);
        try {
            const updated = await descartarBorrador(seccion.key);
            message.success('Borrador descartado');
            const draftPayload = payloadFromResponse(updated);
            form.setFieldsValue({ ...defaultsForKey(seccion.key), ...draftPayload });
            onUpdated(updated);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al descartar');
        } finally {
            setActing(false);
        }
    };

    const handleSolicitarRevision = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            message.error('Revisa los campos marcados');
            return;
        }
        await draft.solicitarRevision(values);
    };

    const handleAprobar = async () => {
        const ok = await draft.aprobar();
        if (ok) {
            if (onReviewDone) onReviewDone();
            else navigate('/revision');
        }
    };

    const handleRechazar = async () => {
        const ok = await draft.rechazar(rechazoComentario);
        if (ok) {
            setRechazoModalOpen(false);
            if (onReviewDone) onReviewDone();
            else navigate('/revision');
        }
    };

    const publishedAt = seccion.publishedAt ?? seccion.published_at;

    const extraButtons = reviewMode ? (
        <Space wrap>
            <Button danger icon={<CloseOutlined />} onClick={() => setRechazoModalOpen(true)}>
                Rechazar
            </Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={handleAprobar}>
                Aprobar
            </Button>
        </Space>
    ) : (
        <Space wrap>
            <Popconfirm
                title="¿Descartar borrador global?"
                description="Volverá al último contenido publicado."
                okText="Descartar"
                cancelText="Cancelar"
                onConfirm={handleDescartar}
            >
                <Button icon={<UndoOutlined />} loading={acting}>
                    Descartar
                </Button>
            </Popconfirm>
            {draft.borradorEstado !== 'pendiente_revision' && (
                <Button icon={<SendOutlined />} onClick={handleSolicitarRevision}>
                    Solicitar revisión
                </Button>
            )}
            <Button icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                Guardar borrador
            </Button>
            <Button type="primary" icon={<SendOutlined />} loading={acting} onClick={handlePublicar}>
                Publicar
            </Button>
        </Space>
    );

    return (
        <Form form={form} layout="vertical" initialValues={initialValues} onValuesChange={handleValuesChange}>
            {!reviewMode && editores.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <PresenciaIndicator editores={editores} />
                </div>
            )}
            {!reviewMode && draft.borradorEstado === 'pendiente_revision' && (
                <Alert type="warning" showIcon message="Tu borrador está pendiente de revisión." style={{ marginBottom: 12 }} />
            )}
            {!reviewMode && draft.borradorEstado === 'rechazado' && draft.comentarioRechazo && (
                <Alert type="warning" showIcon message="Tu borrador fue rechazado" description={draft.comentarioRechazo} style={{ marginBottom: 12 }} />
            )}
            {reviewMode && draft.reviewAuthor && (
                <Alert type="info" showIcon message={`Borrador enviado por ${draft.reviewAuthor.name}`} style={{ marginBottom: 12 }} />
            )}
            <Card title={reg.label} extra={extraButtons}>
                <Editor />
                <div style={{ marginTop: 16 }}>
                    <Space size="large" wrap>
                        {publishedAt && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Última publicación: {new Date(publishedAt).toLocaleString('es-MX')}
                            </Text>
                        )}
                        {updatedAt && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Borrador global actualizado: {new Date(updatedAt).toLocaleString('es-MX')}
                            </Text>
                        )}
                        {draft.saving && <Text type="secondary" style={{ fontSize: 12 }}>Guardando borrador…</Text>}
                    </Space>
                </div>
            </Card>

            <Modal
                title="Rechazar borrador"
                open={rechazoModalOpen}
                onOk={handleRechazar}
                onCancel={() => setRechazoModalOpen(false)}
                okText="Rechazar"
                okType="danger"
                cancelText="Cancelar"
            >
                <p>Se notificará a <strong>{draft.reviewAuthor?.name || 'el editor'}</strong> que su borrador fue rechazado.</p>
                <Input.TextArea
                    placeholder="Motivo del rechazo (opcional)"
                    value={rechazoComentario}
                    onChange={(e) => setRechazoComentario(e.target.value)}
                    rows={3}
                />
            </Modal>
        </Form>
    );
}


export default function HomePage() {
    const [secciones, setSecciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeKey, setActiveKey] = useState('banner');
    const [reviewSectionKey, setReviewSectionKey] = useState(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const reviewMode = searchParams.get('review') === 'true';
    const borradorId = searchParams.get('borrador');
    const { isMobile } = useIsMobile();

    const reload = async () => {
        setLoading(true);
        setError(null);
        try {
            setSecciones(await listSecciones());
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar secciones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { reload(); }, []);

    useEffect(() => {
        if (!reviewMode || !borradorId) return;
        api.get(`/borradores/por-id/${borradorId}`)
            .then((res) => {
                const key = res.data?.resource_id;
                if (key) {
                    setReviewSectionKey(key);
                    setActiveKey(key);
                }
            })
            .catch(() => message.error('No se pudo cargar el borrador en revisión'));
    }, [reviewMode, borradorId]);

    const onSectionUpdated = (updated) => {
        setSecciones((prev) => prev.map((s) => (s.key === updated.key ? updated : s)));
    };

    const seccionesByKey = Object.fromEntries(secciones.map((s) => [s.key, s]));

    if (reviewMode && reviewSectionKey) {
        const seccion = seccionesByKey[reviewSectionKey];
        return (
            <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
                <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                        Revisar sección: {SECTION_REGISTRY[reviewSectionKey]?.label || reviewSectionKey}
                    </Title>
                    {seccion ? (
                        <SectionTab
                            seccion={seccion}
                            onUpdated={onSectionUpdated}
                            active
                            reviewMode
                            borradorId={borradorId}
                            onReviewDone={() => navigate('/revision')}
                        />
                    ) : (
                        <Spin />
                    )}
                </Space>
            </Content>
        );
    }

    const tabs = SECTION_KEYS
        .map((key) => seccionesByKey[key])
        .filter(Boolean)
        .map((s) => {
            const reg = SECTION_REGISTRY[s.key];
            return {
                key: s.key,
                label: reg?.label || s.key,
                forceRender: true,
                children: <SectionTab seccion={s} onUpdated={onSectionUpdated} active={activeKey === s.key} />,
            };
        });

    return (
        <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                    <div>
                        <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Inicio de MapaLab</Title>
                        <Text type="secondary">
                            Edita el contenido de inicio para MapaLab
                        </Text>
                    </div>
                    <Space>
                        <Tag color="blue">Borrador → Publicado</Tag>
                        <Button icon={<ReloadOutlined />} onClick={reload}>Recargar</Button>
                    </Space>
                </Space>

                {error && <Alert type="error" message={error} showIcon closable />}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : (
                    <Tabs
                        activeKey={activeKey}
                        onChange={setActiveKey}
                        destroyOnHidden={false}
                        items={tabs}
                        tabPlacement={isMobile ? 'top' : 'left'}
                        style={{ minHeight: 400 }}
                    />
                )}
            </Space>
        </Content>
    );
}
