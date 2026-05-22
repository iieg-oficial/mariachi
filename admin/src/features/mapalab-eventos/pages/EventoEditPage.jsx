import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Layout, Modal, Select, Space, Spin, Switch, Tabs, Tag, Typography } from 'antd';
import {
    ArrowLeftOutlined,
    CheckOutlined,
    CloseOutlined,
    DatabaseOutlined,
    DeleteOutlined,
    EnvironmentOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    InfoCircleOutlined,
    PictureOutlined,
    SaveOutlined,
    SendOutlined,
    SmileOutlined,
} from '@ant-design/icons';
import {
    createEvento,
    despublicarEvento,
    eliminarEvento,
    publicarEvento,
    updateEvento,
    useEvento,
} from '@features/mapalab-eventos/hooks/useEventos';
import EventoIconPicker from '@features/mapalab-eventos/components/EventoIconPicker';
import BBoxField from '@features/mapalab-eventos/components/BBoxField';
import CapasField from '@features/mapalab-eventos/components/CapasField';
import DeleteEventoModal from '@features/mapalab-eventos/components/DeleteEventoModal';
import FactsField from '@features/mapalab-eventos/components/FactsField';
import MarkdownTextArea from '@shared/components/MarkdownTextArea';
import SymbolSnapshotField from '@features/mapalab-eventos/components/SymbolSnapshotField';
import useIsMobile from '@shared/hooks/useIsMobile';
import usePresencia from '@shared/hooks/usePresencia';
import PresenciaIndicator from '@shared/components/PresenciaIndicator';
import useResourceDraft from '@shared/hooks/useResourceDraft';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Title, Text } = Typography;

function normalizeCapas(capas) {
    return (capas || []).map((c) => {
        const tipo = c.tipo || 'capa';
        if (tipo === 'categoria') {
            return {
                tipo,
                alias: c.alias,
                orden: c.orden ?? 0,
                capas: normalizeCapas(c.capas).map((child) => (
                    child.tipo === 'categoria' ? { ...child, tipo: 'etiqueta', capas: undefined } : child
                )),
            };
        }
        return {
            tipo,
            workspace: c.workspace,
            layer: c.layer,
            alias: c.alias,
            orden: c.orden ?? 0,
            autoActivar: c.autoActivar ?? c.auto_activar ?? true,
        };
    });
}

function eventoToForm(e) {
    if (!e) return { activo: false, capas: [], facts: [], funIcon: null, orden: 0 };
    return {
        titulo: e.titulo,
        slug: e.slug,
        descripcion: e.descripcion,
        iconoUrl: e.iconoUrl,
        imagenUrl: e.imagenUrl,
        bbox: e.bbox,
        capas: normalizeCapas(e.capas),
        facts: Array.isArray(e.facts)
            ? e.facts.map((f) => (typeof f === 'string' ? { text: f, symbol: null } : { text: f?.text || '', symbol: f?.symbol || null }))
            : [],
        funIcon: e.funIcon || null,
        basemapId: e.basemapId || null,
        activo: e.activo,
        fechaInicio: e.fechaInicio ? dayjs(e.fechaInicio) : null,
        fechaFin: e.fechaFin ? dayjs(e.fechaFin) : null,
        orden: e.orden ?? 0,
    };
}

function formToPayload(values, { isCreate }) {
    const cleanBbox = values.bbox && [values.bbox.minx, values.bbox.miny, values.bbox.maxx, values.bbox.maxy].every(
        (v) => v !== null && v !== undefined && v !== ''
    ) ? {
            minx: Number(values.bbox.minx),
            miny: Number(values.bbox.miny),
            maxx: Number(values.bbox.maxx),
            maxy: Number(values.bbox.maxy),
        } : null;

    const cleanFacts = Array.isArray(values.facts)
        ? values.facts
            .map((f) => {
                if (!f) return null;
                if (typeof f === 'string') {
                    const t = f.trim();
                    return t ? { text: t, symbol: null } : null;
                }
                const text = typeof f.text === 'string' ? f.text.trim() : '';
                if (!text) return null;
                return { text, symbol: f.symbol || null };
            })
            .filter(Boolean)
        : [];

    const payload = {
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        iconoUrl: values.iconoUrl || null,
        imagenUrl: values.imagenUrl || null,
        bbox: cleanBbox,
        capas: values.capas || [],
        facts: cleanFacts,
        funIcon: values.funIcon || null,
        basemapId: values.basemapId || null,
        activo: Boolean(values.activo),
        fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString() : null,
        fechaFin: values.fechaFin ? values.fechaFin.toISOString() : null,
        orden: values.orden ?? 0,
    };
    if (values.slug) payload.slug = values.slug;
    if (!isCreate && !values.slug) delete payload.slug;
    return payload;
}

export default function EventoEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isCreate = !id;
    const { isMobile } = useIsMobile();
    const { evento, loading, error, reload } = useEvento(isCreate ? null : id);
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [acting, setActing] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [rechazoModalOpen, setRechazoModalOpen] = useState(false);
    const [rechazoComentario, setRechazoComentario] = useState('');
    const editores = usePresencia(isCreate ? null : `/eventos/${id}`, !isCreate);
    const [searchParams] = useSearchParams();
    const reviewMode = searchParams.get('review') === 'true';
    const borradorId = searchParams.get('borrador');

    const draft = useResourceDraft({
        resourceType: 'evento',
        resourceId: isCreate ? null : id,
        enabled: !isCreate,
        reviewMode,
        borradorId,
        onApplyDraft: (data) => form.setFieldsValue(eventoToForm(data)),
    });

    useEffect(() => {
        if (!isCreate && evento) {
            form.setFieldsValue(eventoToForm(evento));
        } else if (isCreate) {
            form.setFieldsValue({ activo: false, capas: [], facts: [], funIcon: null, orden: 0 });
        }
    }, [evento, isCreate, form]);

    const initialValues = useMemo(() => eventoToForm(evento), [evento]);

    const handleValuesChange = () => {
        if (isCreate || reviewMode) return;
        const values = form.getFieldsValue();
        if (!values.titulo || !String(values.titulo).trim()) return;
        draft.scheduleAutosave(formToPayload(values, { isCreate: false }));
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const payload = formToPayload(values, { isCreate });
            if (isCreate) {
                const created = await createEvento(payload);
                message.success('Evento creado');
                navigate(`/mapalab/eventos/${created.id}/edit`, { replace: true });
            } else {
                draft.cancelAutosave();
                await updateEvento(id, { ...payload, expectedUpdatedAt: evento?.updatedAt });
                await draft.deleteDraft();
                message.success('Evento actualizado');
                await reload();
            }
        } catch (err) {
            if (err?.errorFields) {
                message.error('Revisa los campos marcados');
            } else if (err?.response?.status === 409) {
                message.error('El evento fue modificado por otra persona. Recarga para ver los cambios.');
            } else {
                message.error(err?.response?.data?.detail || 'Error al guardar');
            }
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
            await updateEvento(id, { ...formToPayload(values, { isCreate: false }), expectedUpdatedAt: evento?.updatedAt });
            await publicarEvento(id);
            await draft.deleteDraft();
            message.success('Evento publicado');
            await reload();
        } catch (err) {
            if (err?.response?.status === 409) {
                message.error('El evento fue modificado por otra persona. Recarga para ver los cambios.');
            } else {
                message.error(err?.response?.data?.detail || 'Error al publicar');
            }
        } finally {
            setActing(false);
        }
    };

    const handleDespublicar = async () => {
        setActing(true);
        try {
            await despublicarEvento(id);
            message.success('Evento pasado a borrador');
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al despublicar');
        } finally {
            setActing(false);
        }
    };

    const handleEliminar = async ({ deleteOrphanLayers }) => {
        setActing(true);
        try {
            const result = await eliminarEvento(id, { deleteOrphanLayers });
            const archived = result?.orphanLayersDeleted ?? 0;
            message.success(
                archived > 0
                    ? `Evento eliminado (+${archived} capa${archived === 1 ? '' : 's'} archivada${archived === 1 ? '' : 's'})`
                    : 'Evento eliminado',
            );
            setDeleteModalOpen(false);
            navigate('/mapalab/eventos', { replace: true });
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
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
        const ok = await draft.solicitarRevision(formToPayload(values, { isCreate: false }));
        if (ok) await reload();
    };

    const handleAprobar = async () => {
        const ok = await draft.aprobar();
        if (ok) navigate('/revision');
    };

    const handleRechazar = async () => {
        const ok = await draft.rechazar(rechazoComentario);
        if (ok) {
            setRechazoModalOpen(false);
            setRechazoComentario('');
            navigate('/revision');
        }
    };

    const handleCerrarRechazoModal = () => {
        setRechazoModalOpen(false);
        setRechazoComentario('');
    };

    if (loading && !isCreate) {
        return (
            <Content style={{ padding: 40, textAlign: 'center' }}>
                <Spin />
            </Content>
        );
    }

    const estado = evento?.estado;

    return (
        <Content style={{ padding: isMobile ? 6 : 24, width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(reviewMode ? '/revision' : '/mapalab/eventos')}>
                            Volver
                        </Button>
                        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                            {isCreate ? 'Nuevo evento' : evento?.titulo || '…'}
                        </Title>
                        {estado && (
                            <Tag color={estado === 'published' ? 'green' : 'default'}>
                                {estado === 'published' ? 'Publicado' : 'Borrador'}
                            </Tag>
                        )}
                        {reviewMode && draft.reviewAuthor && (
                            <Tag color="purple">En revisión: {draft.reviewAuthor.name}</Tag>
                        )}
                        {!reviewMode && draft.borradorEstado === 'pendiente_revision' && (
                            <Tag color="orange">Pendiente revisión</Tag>
                        )}
                    </Space>
                    <Space wrap>
                        {reviewMode ? (
                            <>
                                <Button danger icon={<CloseOutlined />} onClick={() => setRechazoModalOpen(true)}>
                                    Rechazar
                                </Button>
                                <Button type="primary" icon={<CheckOutlined />} onClick={handleAprobar}>
                                    Aprobar
                                </Button>
                            </>
                        ) : (
                            <>
                                {!isCreate && estado === 'draft' && (
                                    <Button icon={<SendOutlined />} type="primary" loading={acting} onClick={handlePublicar}>
                                        Publicar
                                    </Button>
                                )}
                                {!isCreate && estado === 'published' && (
                                    <Button icon={<EyeInvisibleOutlined />} loading={acting} onClick={handleDespublicar}>
                                        Despublicar
                                    </Button>
                                )}
                                {!isCreate && draft.borradorEstado !== 'pendiente_revision' && (
                                    <Button icon={<SendOutlined />} onClick={handleSolicitarRevision}>
                                        Solicitar revisión
                                    </Button>
                                )}
                                {!isCreate && (
                                    <Button
                                        danger
                                        icon={<DeleteOutlined />}
                                        loading={acting}
                                        onClick={() => setDeleteModalOpen(true)}
                                    >
                                        Eliminar
                                    </Button>
                                )}
                                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                                    {isCreate ? 'Crear' : 'Guardar'}
                                </Button>
                            </>
                        )}
                    </Space>
                </Space>

                {error && <Alert type="error" message={error} showIcon closable />}
                <PresenciaIndicator editores={editores} />
                {!reviewMode && draft.borradorEstado === 'rechazado' && draft.comentarioRechazo && (
                    <Alert closable
                        type="warning"
                        showIcon
                        message="Tu borrador fue rechazado"
                        description={draft.comentarioRechazo}
                    />
                )}
                {draft.saving && <Text type="secondary" style={{ fontSize: 12 }}>Guardando borrador…</Text>}

                <Form form={form} layout="vertical" initialValues={initialValues} onValuesChange={handleValuesChange}>
                    <Card styles={{ body: { padding: isMobile ? 6 : 16 } }}>
                        <Tabs
                            defaultActiveKey="info"
                            tabPosition={isMobile ? 'top' : 'left'}
                            destroyOnHidden={false}
                            style={{ minHeight: 400 }}
                            items={[
                                {
                                    key: 'info',
                                    forceRender: true,
                                    label: <span><InfoCircleOutlined /> Información</span>,
                                    children: (
                                        <>
                                            <Form.Item
                                                name="titulo"
                                                label="Título"
                                                rules={[{ required: true, message: 'El título es obligatorio' }]}
                                            >
                                                <Input placeholder="Ejemplo: Mundial 2026" />
                                            </Form.Item>
                                            <Form.Item
                                                name="slug"
                                                label="Slug (opcional)"
                                                extra="Si lo dejas vacío, se genera del título. Solo letras, números y guiones."
                                            >
                                                <Input placeholder="mundial-2026" />
                                            </Form.Item>
                                            <Form.Item name="descripcion" label="Descripción">
                                                <MarkdownTextArea
                                                    rows={4}
                                                    placeholder="Texto breve que se mostrará al abrir el evento. Soporta **negritas**, *cursivas*, ~~tachado~~ y [enlaces](url)."
                                                />
                                            </Form.Item>
                                        </>
                                    ),
                                },
                                {
                                    key: 'capas',
                                    forceRender: true,
                                    label: <span><DatabaseOutlined /> Capas</span>,
                                    children: (
                                        <Form.Item name="capas" noStyle>
                                            <CapasField />
                                        </Form.Item>
                                    ),
                                },
                                {
                                    key: 'visibilidad',
                                    forceRender: true,
                                    label: <span><EyeOutlined /> Visibilidad</span>,
                                    children: (
                                        <>
                                            <Form.Item name="activo" label="Activo" valuePropName="checked" extra="Si está apagado no aparece en el visor aunque esté publicado.">
                                                <Switch />
                                            </Form.Item>
                                            <Form.Item name="fechaInicio" label="Fecha de inicio (opcional)">
                                                <DatePicker showTime style={{ width: '100%' }} />
                                            </Form.Item>
                                            <Form.Item name="fechaFin" label="Fecha de fin (opcional)">
                                                <DatePicker showTime style={{ width: '100%' }} />
                                            </Form.Item>
                                            <Form.Item name="orden" label="Orden" extra="Si hay varios eventos visibles a la vez, ordena de menor a mayor.">
                                                <InputNumber min={0} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </>
                                    ),
                                },
                                {
                                    key: 'apariencia',
                                    forceRender: true,
                                    label: <span><PictureOutlined /> Apariencia</span>,
                                    children: (
                                        <>
                                            <Form.Item
                                                name="iconoUrl"
                                                label="Icono compacto (sider colapsado)"
                                                extra="Imagen pequeña, idealmente cuadrada (~64×64). Se muestra cuando el sider del visor está colapsado."
                                            >
                                                <EventoIconPicker />
                                            </Form.Item>
                                            <Form.Item
                                                name="imagenUrl"
                                                label="Imagen banner (sider expandido)"
                                                extra="Imagen ancha tipo banner (3:1 o 4:1). Se muestra cuando el sider del visor está expandido."
                                            >
                                                <EventoIconPicker />
                                            </Form.Item>
                                            <Form.Item
                                                name="basemapId"
                                                label="Mapa base al abrir el evento"
                                                extra="Si lo dejas vacío, el visor respeta el mapa base activo del usuario. Si eliges uno, se aplica al abrir el evento y se restaura al cerrarlo."
                                            >
                                                <Select
                                                    allowClear
                                                    placeholder="No forzar (respeta la elección del usuario)"
                                                    options={[
                                                        { value: 'voyager', label: 'Carto Voyager (default)' },
                                                        { value: 'position', label: 'Carto Light' },
                                                        { value: 'sin_mapalab', label: 'Sin mapa base' },
                                                    ]}
                                                />
                                            </Form.Item>
                                        </>
                                    ),
                                },
                                {
                                    key: 'diversion',
                                    forceRender: true,
                                    label: <span><SmileOutlined /> Diversión</span>,
                                    children: (
                                        <>
                                            <Alert
                                                type="info"
                                                showIcon
                                                style={{ marginBottom: 16 }}
                                                message="Botón lúdico del evento"
                                                description="Cuando el evento tiene al menos un dato curioso, el visor muestra un botón pequeño en la barra de acciones. Al presionarlo, sale el ícono rebotando hacia abajo y aparece un mensaje con un dato del pool. Los datos se muestran sin repetir hasta agotar el pool."
                                            />
                                            <Form.Item
                                                name="funIcon"
                                                label="Ícono del botón lúdico"
                                                extra="Símbolo del catálogo de MapaLab. Si no eliges nada, el visor usa un balón ⚽ por defecto."
                                            >
                                                <SymbolSnapshotField placeholder="⚽ Balón (default)" />
                                            </Form.Item>
                                            <Form.Item
                                                name="facts"
                                                label="Datos curiosos"
                                                extra="Si dejas la lista vacía, el botón no aparece en el visor."
                                            >
                                                <FactsField />
                                            </Form.Item>
                                        </>
                                    ),
                                },
                                {
                                    key: 'geografia',
                                    forceRender: true,
                                    label: <span><EnvironmentOutlined /> Geografía</span>,
                                    children: (
                                        <Form.Item name="bbox" noStyle>
                                            <BBoxField />
                                        </Form.Item>
                                    ),
                                },
                            ]}
                        />
                    </Card>
                </Form>

                {!isCreate && evento?.publishedAt && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Última publicación: {new Date(evento.publishedAt).toLocaleString('es-MX')}
                    </Text>
                )}
            </Space>

            <Modal
                title="Rechazar borrador"
                open={rechazoModalOpen}
                onOk={handleRechazar}
                onCancel={handleCerrarRechazoModal}
                okText="Rechazar"
                okType="danger"
                cancelText="Cancelar"
                destroyOnHidden
            >
                <p>Se notificará a <strong>{draft.reviewAuthor?.name || 'el editor'}</strong> que su borrador fue rechazado.</p>
                <Input.TextArea
                    placeholder="Motivo del rechazo (opcional)"
                    value={rechazoComentario}
                    onChange={(e) => setRechazoComentario(e.target.value)}
                    rows={3}
                />
            </Modal>
            <DeleteEventoModal
                open={deleteModalOpen}
                evento={evento}
                onCancel={() => setDeleteModalOpen(false)}
                onConfirm={handleEliminar}
                loading={acting}
            />
        </Content>
    );
}
