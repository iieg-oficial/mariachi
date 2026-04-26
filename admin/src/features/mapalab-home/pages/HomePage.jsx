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
    Tabs,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    ReloadOutlined,
    SaveOutlined,
    SendOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import {
    descartarBorrador,
    listSecciones,
    publicarSeccion,
    saveBorrador,
} from '@features/mapalab-home/api/homeService';
import { SECTION_DEFAULTS, SECTION_KEYS, SECTION_REGISTRY } from '@features/mapalab-home/components/sectionEditors';
import useIsMobile from '@shared/hooks/useIsMobile';

const { Content } = Layout;
const { Title, Text } = Typography;


function defaultsForKey(key) {
    return SECTION_DEFAULTS[key] || {};
}


function payloadFromResponse(seccion) {
    return seccion?.payloadDraft ?? seccion?.payload_draft ?? {};
}


function SectionTab({ seccion, onUpdated }) {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [acting, setActing] = useState(false);
    const reg = SECTION_REGISTRY[seccion.key];
    const Editor = reg.Editor;

    const initialValues = { ...defaultsForKey(seccion.key), ...payloadFromResponse(seccion) };
    const updatedAt = seccion.updatedAt ?? seccion.updated_at ?? '';
    const draftSnapshot = JSON.stringify(payloadFromResponse(seccion));

    useEffect(() => {
        form.resetFields();
        form.setFieldsValue({ ...defaultsForKey(seccion.key), ...payloadFromResponse(seccion) });
    }, [updatedAt, draftSnapshot, seccion.key, form, seccion]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const updated = await saveBorrador(seccion.key, values);
            message.success('Borrador guardado');
            onUpdated(updated);
        } catch (err) {
            if (err?.errorFields) message.error('Revisa los campos marcados');
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
            await saveBorrador(seccion.key, values);
            const updated = await publicarSeccion(seccion.key);
            message.success(`Sección "${reg.label}" publicada`);
            onUpdated(updated);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al publicar');
        } finally {
            setActing(false);
        }
    };

    const handleDescartar = async () => {
        setActing(true);
        try {
            const updated = await descartarBorrador(seccion.key);
            message.success('Borrador descartado');
            const draft = payloadFromResponse(updated);
            form.setFieldsValue({ ...defaultsForKey(seccion.key), ...draft });
            onUpdated(updated);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al descartar');
        } finally {
            setActing(false);
        }
    };

    const publishedAt = seccion.publishedAt ?? seccion.published_at;

    return (
        <Form form={form} layout="vertical" initialValues={initialValues}>
            <Card
                title={reg.label}
                extra={
                    <Space wrap>
                        <Popconfirm
                            title="¿Descartar borrador?"
                            description="Volverá al último contenido publicado."
                            okText="Descartar"
                            cancelText="Cancelar"
                            onConfirm={handleDescartar}
                        >
                            <Button icon={<UndoOutlined />} loading={acting}>
                                Descartar
                            </Button>
                        </Popconfirm>
                        <Button icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                            Guardar borrador
                        </Button>
                        <Button type="primary" icon={<SendOutlined />} loading={acting} onClick={handlePublicar}>
                            Publicar
                        </Button>
                    </Space>
                }
            >
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
                                Borrador actualizado: {new Date(updatedAt).toLocaleString('es-MX')}
                            </Text>
                        )}
                    </Space>
                </div>
            </Card>
        </Form>
    );
}


export default function HomePage() {
    const [secciones, setSecciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeKey, setActiveKey] = useState('banner');
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

    const onSectionUpdated = (updated) => {
        setSecciones((prev) => prev.map((s) => (s.key === updated.key ? updated : s)));
    };

    const seccionesByKey = Object.fromEntries(secciones.map((s) => [s.key, s]));
    const tabs = SECTION_KEYS
        .map((key) => seccionesByKey[key])
        .filter(Boolean)
        .map((s) => {
            const reg = SECTION_REGISTRY[s.key];
            return {
                key: s.key,
                label: reg?.label || s.key,
                forceRender: true,
                children: <SectionTab seccion={s} onUpdated={onSectionUpdated} />,
            };
        });

    return (
        <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                    <div>
                        <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Home MapaLab</Title>
                        <Text type="secondary">
                            Edita el contenido del landing del visor. Cada sección tiene un borrador independiente
                            que solo se publica cuando lo confirmas.
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
                        tabPosition={isMobile ? 'top' : 'left'}
                        style={{ minHeight: 400 }}
                    />
                )}
            </Space>
        </Content>
    );
}
