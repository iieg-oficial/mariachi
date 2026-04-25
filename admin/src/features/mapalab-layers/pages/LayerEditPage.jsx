import { useEffect, useState, useMemo, useCallback } from 'react';
import {
    AutoComplete,
    Breadcrumb,
    Button,
    Card,
    Col,
    Form,
    Input,
    Layout,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Tabs,
    Tag,
    Tree,
    Typography,
    message,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import useIsMobile from '@shared/hooks/useIsMobile';
import { useAuth } from '@shared/contexts/AuthContext';
import InfoBoxPresetForm from '@features/mapalab-layers/components/layersEditor/InfoBoxPresetForm';
import InfoBoxPreview from '@features/mapalab-layers/components/layersEditor/InfoBoxPreview';
import InfoBoxJsonEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxJsonEditor';
import LayerMetadataSection from '@features/mapalab-layers/components/layersEditor/LayerMetadataSection';
import LayerAliasesSection from '@features/mapalab-layers/components/layersEditor/LayerAliasesSection';

const { Content, Sider } = Layout;
const { Text, Title } = Typography;

const NODE_TYPE_OPTIONS = [
    { value: 'tema', label: 'tema' },
    { value: 'category', label: 'category' },
    { value: 'label', label: 'label' },
    { value: 'group', label: 'group' },
    { value: 'leaf', label: 'leaf' },
];

export default function LayerEditPage() {
    const { id: layerId } = useParams();
    const navigate = useNavigate();
    const { isMobile } = useIsMobile();
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';

    const {
        treeData,
        reload,
        getLayer,
        updateLayer,
        saveLayerDraft,
        requestReview,
        getLayerDraft,
        listGeoserverWorkspaces,
        listGeoserverStyles,
        listLayerAliases,
        createLayerAlias,
        deleteLayerAlias,
        suggestSlug,
    } = useLayerTreeAdmin();

    const [form] = Form.useForm();
    const [layer, setLayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [availableStyles, setAvailableStyles] = useState([]);

    const selectedWs = Form.useWatch('workspaceAlias', form);
    const selectedGsLayer = Form.useWatch('geoserverLayer', form);
    const selectedTemplate = Form.useWatch('infoboxTemplate', form);
    const watchedParams = Form.useWatch('infoboxParams', form);
    const watchedConfig = Form.useWatch('infoboxConfig', form);

    useEffect(() => {
        reload();
    }, [reload]);

    useEffect(() => {
        let cancelled = false;
        listGeoserverWorkspaces()
            .then((data) => { if (!cancelled) setWorkspaces(data); })
            .catch(() => { if (!cancelled) setWorkspaces([]); });
        return () => { cancelled = true; };
    }, [listGeoserverWorkspaces]);

    useEffect(() => {
        if (!selectedWs || !selectedGsLayer) return;
        let cancelled = false;
        listGeoserverStyles(selectedWs, selectedGsLayer)
            .then((data) => { if (!cancelled) setAvailableStyles(data); })
            .catch(() => { if (!cancelled) setAvailableStyles([]); });
        return () => { cancelled = true; };
    }, [selectedWs, selectedGsLayer, listGeoserverStyles]);

    const populate = useCallback((data) => {
        form.setFieldsValue({
            label: data.label,
            slug: data.slug,
            nodeType: data.nodeType,
            hiddenInMenu: data.hiddenInMenu,
            disabled: data.disabled,
            workspaceAlias: data.workspaceAlias,
            geoserverLayer: data.geoserverLayer,
            styles: data.styles,
            cqlFilter: data.cqlFilter,
            wmsGroup: data.wmsGroup,
            wfsAvailable: data.wfsAvailable,
            downloadable: data.downloadable,
            searchTags: (data.searchMeta?.tags || data.search_tags || []).join(', '),
            infoboxTemplate: data.infoboxTemplate,
            infoboxParams: data.infoboxParams || {},
            infoboxConfig: data.infoboxConfig || null,
        });
    }, [form]);

    useEffect(() => {
        if (!layerId) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const fresh = await getLayer(layerId);
                if (cancelled) return;
                if (!isAdmin) {
                    const draft = await getLayerDraft(layerId);
                    if (draft?.data) {
                        setLayer({ ...fresh, ...draft.data, id: fresh.id, _draftEstado: draft.estado });
                        populate({ ...fresh, ...draft.data });
                        return;
                    }
                }
                setLayer(fresh);
                populate(fresh);
            } catch (err) {
                message.error(err?.response?.data?.detail || 'No se pudo cargar la capa');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [layerId, isAdmin, getLayer, getLayerDraft, populate]);

    const buildPayload = async () => {
        const values = await form.validateFields();
        const tagsArray = (values.searchTags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        return { ...values, searchTags: tagsArray };
    };

    const handleSaveDirect = async () => {
        setSaving(true);
        try {
            const payload = await buildPayload();
            await updateLayer(layerId, payload);
            message.success(`Capa "${layerId}" actualizada`);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            const payload = await buildPayload();
            await saveLayerDraft(layerId, payload);
            message.success('Borrador guardado');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar borrador');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitReview = async () => {
        setSaving(true);
        try {
            const payload = await buildPayload();
            await saveLayerDraft(layerId, payload);
            await requestReview(layerId);
            message.success('Enviado a revisión');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al enviar a revisión');
        } finally {
            setSaving(false);
        }
    };

    const selectedWsObj = workspaces.find((w) => w.alias === selectedWs);
    const availableLayers = selectedWsObj?.layers || [];

    const treeForSider = useMemo(
        () => treeData.map((n) => ({ ...n, selectable: true })),
        [treeData],
    );

    const actionButtons = (
        <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/mapalab/layers')}>
                Volver
            </Button>
            {isAdmin ? (
                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSaveDirect}>
                    Guardar
                </Button>
            ) : (
                <>
                    <Button loading={saving} onClick={handleSaveDraft}>
                        Guardar borrador
                    </Button>
                    <Button type="primary" loading={saving} onClick={handleSubmitReview}>
                        Enviar a revisión
                    </Button>
                </>
            )}
        </Space>
    );

    const handleSuggestSlug = async () => {
        const label = form.getFieldValue('label');
        if (!label) {
            message.warning('Captura un label primero');
            return;
        }
        try {
            const { slug, available } = await suggestSlug(label);
            form.setFieldValue('slug', slug);
            if (!available) {
                message.info(`Slug sugerido (con sufijo, '${slug}') porque hubo colision`);
            }
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al sugerir slug');
        }
    };

    const tabItems = [
        {
            key: 'identidad',
            label: 'Identidad',
            children: (
                <>
                    <Form.Item label="Label" name="label" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Slug publico"
                        name="slug"
                        extra="Identificador para URLs publicas: solo minusculas, numeros y guiones (e.g. establecimientos-salud). Vacio = no aparece en deeplinks."
                        rules={[
                            {
                                pattern: /^[a-z0-9-]+$/,
                                message: 'Solo minusculas, numeros y guiones',
                            },
                            { max: 60 },
                        ]}
                    >
                        <Space.Compact style={{ width: '100%' }}>
                            <Input placeholder="establecimientos-salud" />
                            <Button onClick={handleSuggestSlug}>Sugerir desde label</Button>
                        </Space.Compact>
                    </Form.Item>
                    <Form.Item label="Node type" name="nodeType">
                        <Select options={NODE_TYPE_OPTIONS} />
                    </Form.Item>
                    <Form.Item label="Tags de búsqueda (coma)" name="searchTags">
                        <Input placeholder="seguridad, delito, feminicidio" />
                    </Form.Item>
                    <Form.Item label="Oculta en menú" name="hiddenInMenu" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item label="Deshabilitada (prefijo *)" name="disabled" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </>
            ),
        },
        {
            key: 'aliases',
            label: 'Aliases',
            children: (
                <LayerAliasesSection
                    layerId={layerId}
                    listAliases={listLayerAliases}
                    createAlias={createLayerAlias}
                    deleteAlias={deleteLayerAlias}
                />
            ),
        },
        {
            key: 'wms',
            label: 'WMS',
            children: (
                <>
                    <Form.Item label="Workspace" name="workspaceAlias">
                        <Select
                            showSearch
                            allowClear
                            placeholder="Selecciona workspace"
                            options={workspaces.map((w) => ({
                                value: w.alias,
                                label: `${w.label || w.alias} (${w.layers?.length || 0} capas)`,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item label="Capa GeoServer" name="geoserverLayer">
                        <AutoComplete
                            options={availableLayers.map((l) => ({ value: l }))}
                            filterOption={(input, option) =>
                                option.value.toLowerCase().includes(input.toLowerCase())
                            }
                            placeholder={selectedWs ? 'Elige una capa del workspace' : 'Selecciona workspace primero'}
                            disabled={!selectedWs}
                        />
                    </Form.Item>
                    <Form.Item label="Estilo" name="styles">
                        <AutoComplete
                            options={availableStyles.map((s) => ({ value: s }))}
                            placeholder="Vacío = estilo por defecto"
                        />
                    </Form.Item>
                    <Form.Item label="CQL filter" name="cqlFilter">
                        <Input.TextArea rows={2} placeholder="modalidad = 'Con violencia'" />
                    </Form.Item>
                    <Form.Item label="WMS group" name="wmsGroup" extra="Capas con mismo grupo se mergean en una request WMS">
                        <Input />
                    </Form.Item>
                </>
            ),
        },
        {
            key: 'descarga',
            label: 'Descarga',
            children: (
                <>
                    <Form.Item label="WFS disponible" name="wfsAvailable" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item label="Descargable" name="downloadable" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </>
            ),
        },
        {
            key: 'infobox',
            label: 'InfoBox',
            children: (
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Form.Item label="Template" name="infoboxTemplate">
                            <Select
                                allowClear
                                options={[
                                    { value: 'municipio', label: 'municipio' },
                                    { value: 'punto', label: 'punto' },
                                    { value: 'punto_municipio', label: 'punto_municipio' },
                                    { value: 'punto_ubicacion', label: 'punto_ubicacion' },
                                    { value: 'punto_completo', label: 'punto_completo' },
                                    { value: 'custom', label: 'custom (JSON libre)' },
                                ]}
                            />
                        </Form.Item>
                        {selectedTemplate && selectedTemplate !== 'custom' && (
                            <InfoBoxPresetForm template={selectedTemplate} />
                        )}
                        {selectedTemplate === 'custom' && (
                            <Form.Item name="infoboxConfig" label="Configuración JSON">
                                <InfoBoxJsonEditor key={layer?.id} />
                            </Form.Item>
                        )}
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Preview</Text>
                        <InfoBoxPreview
                            template={selectedTemplate}
                            params={selectedTemplate === 'custom' ? watchedConfig : watchedParams}
                        />
                    </Col>
                </Row>
            ),
        },
        {
            key: 'metadatos',
            label: 'Metadatos descriptivos',
            children: layer ? <LayerMetadataSection layerKey={layer.id} /> : null,
        },
    ];

    return (
        <Layout style={{ minHeight: 'calc(100vh - 112px)', background: 'transparent' }}>
            {!isMobile && (
                <Sider
                    width={280}
                    theme="light"
                    style={{
                        background: '#fff',
                        borderRight: '1px solid #f0f0f0',
                        overflow: 'auto',
                    }}
                >
                    <div style={{ padding: 12 }}>
                        <Title level={5} style={{ margin: '0 0 12px' }}>Árbol de capas</Title>
                        <Tree
                            treeData={treeForSider}
                            selectedKeys={layerId ? [layerId] : []}
                            onSelect={(keys) => {
                                if (keys[0]) navigate(`/mapalab/layers/${encodeURIComponent(keys[0])}/edit`);
                            }}
                            blockNode
                            showLine={{ showLeafIcon: false }}
                            defaultExpandAll
                        />
                    </div>
                </Sider>
            )}
            <Content style={{ padding: isMobile ? 12 : 24 }}>
                <div style={{ marginBottom: 16 }}>
                    <Breadcrumb
                        items={[
                            { title: <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/mapalab/layers')}>Capas</Button> },
                            { title: layer?.label || layerId },
                        ]}
                        style={{ marginBottom: 8 }}
                    />
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}>
                        <Space wrap>
                            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                                {layer?.label || 'Editar capa'}
                            </Title>
                            <Tag color="purple">{layerId}</Tag>
                        </Space>
                        {actionButtons}
                    </div>
                </div>

                <Card>
                    {loading ? (
                        <Spin style={{ display: 'block', margin: '48px auto' }} size="large" />
                    ) : (
                        <Form form={form} layout="vertical">
                            <Tabs defaultActiveKey="identidad" items={tabItems} />
                        </Form>
                    )}
                </Card>
            </Content>
        </Layout>
    );
}
