import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import {
    Alert,
    Button,
    Card,
    Col,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Layout,
    Modal,
    Popconfirm,
    Row,
    Space,
    Spin,
    Switch,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    ArrowLeftOutlined,
    CheckOutlined,
    CloseOutlined,
    DeleteOutlined,
    EyeInvisibleOutlined,
    SaveOutlined,
    SendOutlined,
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
import useIsMobile from '@shared/hooks/useIsMobile';
import usePresencia from '@shared/hooks/usePresencia';
import PresenciaIndicator from '@shared/components/PresenciaIndicator';
import useResourceDraft from '@shared/hooks/useResourceDraft';

const { Content } = Layout;
const { Title, Text } = Typography;


function eventoToForm(e) {
    if (!e) return { activo: false, capas: [], orden: 0 };
    return {
        titulo: e.titulo,
        slug: e.slug,
        descripcion: e.descripcion,
        icono_url: e.iconoUrl ?? e.icono_url,
        imagen_url: e.imagenUrl ?? e.imagen_url,
        bbox: e.bbox,
        capas: e.capas || [],
        activo: e.activo,
        fecha_inicio: (e.fechaInicio ?? e.fecha_inicio) ? dayjs(e.fechaInicio ?? e.fecha_inicio) : null,
        fecha_fin: (e.fechaFin ?? e.fecha_fin) ? dayjs(e.fechaFin ?? e.fecha_fin) : null,
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

    const payload = {
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        icono_url: values.icono_url || null,
        imagen_url: values.imagen_url || null,
        bbox: cleanBbox,
        capas: values.capas || [],
        activo: Boolean(values.activo),
        fecha_inicio: values.fecha_inicio ? values.fecha_inicio.toISOString() : null,
        fecha_fin: values.fecha_fin ? values.fecha_fin.toISOString() : null,
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
            form.setFieldsValue({ activo: false, capas: [], orden: 0 });
        }
    }, [evento, isCreate, form]);

    const initialValues = useMemo(() => eventoToForm(evento), [evento]);

    const handleValuesChange = () => {
        if (isCreate || reviewMode) return;
        const values = form.getFieldsValue();
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

    const handleEliminar = async () => {
        setActing(true);
        try {
            await eliminarEvento(id);
            message.success('Evento eliminado');
            navigate('/mapalab/eventos', { replace: true });
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
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
            navigate('/revision');
        }
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
        <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
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
                                    <Popconfirm
                                        title="¿Eliminar evento?"
                                        okText="Eliminar"
                                        cancelText="Cancelar"
                                        okButtonProps={{ danger: true }}
                                        onConfirm={handleEliminar}
                                    >
                                        <Button danger icon={<DeleteOutlined />} loading={acting}>
                                            Eliminar
                                        </Button>
                                    </Popconfirm>
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
                    <Alert
                        type="warning"
                        showIcon
                        message="Tu borrador fue rechazado"
                        description={draft.comentarioRechazo}
                    />
                )}
                {draft.saving && <Text type="secondary" style={{ fontSize: 12 }}>Guardando borrador…</Text>}

                <Form form={form} layout="vertical" initialValues={initialValues} onValuesChange={handleValuesChange}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} lg={14}>
                            <Card title="Información">
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
                                    <Input.TextArea rows={4} placeholder="Texto breve que se mostrará al abrir el evento" />
                                </Form.Item>
                            </Card>

                            <Card title="Capas asociadas" style={{ marginTop: 16 }}>
                                <Form.Item name="capas" noStyle>
                                    <CapasField />
                                </Form.Item>
                            </Card>
                        </Col>

                        <Col xs={24} lg={10}>
                            <Card title="Visibilidad">
                                <Form.Item name="activo" label="Activo" valuePropName="checked" extra="Si está apagado no aparece en el visor aunque esté publicado.">
                                    <Switch />
                                </Form.Item>
                                <Form.Item name="fecha_inicio" label="Fecha de inicio (opcional)">
                                    <DatePicker showTime style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name="fecha_fin" label="Fecha de fin (opcional)">
                                    <DatePicker showTime style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name="orden" label="Orden" extra="Si hay varios eventos visibles a la vez, ordena de menor a mayor.">
                                    <InputNumber min={0} style={{ width: '100%' }} />
                                </Form.Item>
                            </Card>

                            <Card title="Apariencia" style={{ marginTop: 16 }}>
                                <Form.Item
                                    name="icono_url"
                                    label="Icono compacto (sider colapsado)"
                                    extra="Imagen pequeña, idealmente cuadrada (~64×64). Se muestra cuando el sider del visor está colapsado."
                                >
                                    <EventoIconPicker />
                                </Form.Item>
                                <Form.Item
                                    name="imagen_url"
                                    label="Imagen banner (sider expandido)"
                                    extra="Imagen ancha tipo banner (3:1 o 4:1). Se muestra cuando el sider del visor está expandido."
                                >
                                    <EventoIconPicker />
                                </Form.Item>
                            </Card>

                            <Card title="Geografía" style={{ marginTop: 16 }}>
                                <Form.Item name="bbox" noStyle>
                                    <BBoxField />
                                </Form.Item>
                            </Card>
                        </Col>
                    </Row>
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
        </Content>
    );
}
