import { useEffect, useState, useCallback } from 'react';
import {
    AutoComplete,
    Breadcrumb,
    Button,
    Card,
    Col,
    Empty,
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
    Tooltip,
    Typography,
    message,
} from 'antd';
import { LeftOutlined, MenuUnfoldOutlined, PartitionOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import useIsMobile from '@shared/hooks/useIsMobile';
import { useAuth } from '@shared/contexts/useAuth';
import InfoBoxPresetForm from '@features/mapalab-layers/components/layersEditor/InfoBoxPresetForm';
import InfoBoxPreview from '@features/mapalab-layers/components/layersEditor/InfoBoxPreview';
import InfoBoxJsonEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxJsonEditor';
import LayerMetadataSection from '@features/mapalab-layers/components/layersEditor/LayerMetadataSection';
import LayerAliasesSection from '@features/mapalab-layers/components/layersEditor/LayerAliasesSection';
import LayersTreeSider from '@features/mapalab-layers/components/LayersTreeSider';
import BulkTagsDrawer from '@features/mapalab-layers/components/layersEditor/BulkTagsDrawer';
import { NODE_TYPE_OPTIONS } from '@features/mapalab-layers/constants/nodeTypes';
import useResizableWidth from '@shared/hooks/useResizableWidth';

const { Content, Sider } = Layout;
const { Text, Title, Paragraph } = Typography;

export default function LayerEditPage() {
    const { id: layerId } = useParams();
    const navigate = useNavigate();
    const { isMobile } = useIsMobile();
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';

    const {
        treeData,
        loading: treeLoading,
        error: treeError,
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
        reorderLayers,
    } = useLayerTreeAdmin();

    const [form] = Form.useForm();
    const [layer, setLayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [availableStyles, setAvailableStyles] = useState([]);
    const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
    const { width: siderWidth, handleStart: handleSiderResize } = useResizableWidth({
        initialWidth: 320,
        storageKey: 'mapalab.layerEditor.siderWidth',
        min: 240,
        max: 600,
    });
    const [siderCollapsed, setSiderCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        const stored = window.localStorage.getItem('mapalab.layerEditor.siderCollapsed');
        if (stored !== null) return stored === 'true';
        // Sin preferencia: colapsado en pantallas medianas y chicas (< lg breakpoint de antd, 992px)
        return window.matchMedia('(max-width: 991.98px)').matches;
    });
    const toggleSider = () => {
        setSiderCollapsed((prev) => {
            const next = !prev;
            window.localStorage.setItem('mapalab.layerEditor.siderCollapsed', String(next));
            return next;
        });
    };

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

    const handleSelectFromTree = (key) => {
        if (!key) {
            navigate('/mapalab/layers');
        } else {
            navigate(`/mapalab/layers/${encodeURIComponent(key)}/edit`);
        }
    };

    const actionButtons = layerId && (
        <Space wrap>
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
            message.warning('Captura un nombre primero');
            return;
        }
        try {
            const { slug, available } = await suggestSlug(label);
            form.setFieldValue('slug', slug);
            message.success(available
                ? `Slug sugerido: '${slug}'`
                : `Slug sugerido (con sufijo, '${slug}') porque ya existía uno con ese nombre`);
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
                    <Form.Item
                        label="Nombre"
                        name="label"
                        extra="Nombre que ven los usuarios en la lista de capas y la leyenda del mapa."
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Nombre en URL"
                        name="slug"
                        extra="Nombre que se utiliza en la URL para acceder a la capa. Solo se permiten minúsculas, números y guiones. Estable, debe cambiar pocas veces. Vacío = no aparece en deeplinks. Ejemplos: establecimientos-salud, indices-desarrollo-urbano."
                        rules={[
                            {
                                pattern: /^[a-z0-9-]+$/,
                                message: 'Solo minúsculas, números y guiones',
                            },
                            { max: 60 },
                        ]}
                    >
                        <Input
                            placeholder="establecimientos-salud"
                            addonAfter={
                                <Tooltip title="Genera un nombre en URL desde el nombre de la capa (lowercase, sin acentos, guiones por espacios). Valida que esté disponible; si ya existe agrega sufijo numérico.">
                                    <Button
                                        type="link"
                                        size="small"
                                        onClick={handleSuggestSlug}
                                        style={{ padding: 0, height: 'auto' }}
                                    >
                                        Sugerir
                                    </Button>
                                </Tooltip>
                            }
                        />
                    </Form.Item>
                    <Form.Item label="Alias (atajos opcionales)">
                        <LayerAliasesSection
                            layerId={layerId}
                            listAliases={listLayerAliases}
                            createAlias={createLayerAlias}
                            deleteAlias={deleteLayerAlias}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Tipo de nodo"
                        name="nodeType"
                        extra="Rol del nodo en la jerarquía: Tema/Categoría/Etiqueta/Grupo organizan; Capa es la capa WMS real."
                    >
                        <Select options={NODE_TYPE_OPTIONS} />
                    </Form.Item>
                    <Form.Item
                        label="Etiquetas de búsqueda (separadas por coma)"
                        name="searchTags"
                        extra="Palabras clave adicionales para filtrar la capa en el buscador del visor. Ej: 'seguridad, delito, feminicidio'."
                    >
                        <Input placeholder="seguridad, delito, feminicidio" />
                    </Form.Item>
                    <Form.Item
                        label="Oculta en menú"
                        name="hiddenInMenu"
                        valuePropName="checked"
                        extra="Si está activa, la capa no aparece en el árbol del visor pero sigue siendo accesible vía URL/slug."
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item
                        label="Deshabilitada (prefijo *)"
                        name="disabled"
                        valuePropName="checked"
                        extra="Marca la capa como deshabilitada (en mantenimiento, sin datos). Aparece atenuada con asterisco; no se puede activar."
                    >
                        <Switch />
                    </Form.Item>
                </>
            ),
        },
        {
            key: 'wms',
            label: 'Servicio WMS',
            children: (
                <>
                    <Form.Item
                        label="Workspace de GeoServer"
                        name="workspaceAlias"
                        extra="Espacio de trabajo donde reside la capa en GeoServer (alias interno definido en la tabla workspaces)."
                    >
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
                    <Form.Item
                        label="Capa de GeoServer"
                        name="geoserverLayer"
                        extra="Nombre técnico de la capa en GeoServer (sin prefijo de workspace). Debe existir en el workspace seleccionado."
                    >
                        <AutoComplete
                            options={availableLayers.map((l) => ({ value: l }))}
                            filterOption={(input, option) =>
                                option.value.toLowerCase().includes(input.toLowerCase())
                            }
                            placeholder={selectedWs ? 'Elige una capa del workspace' : 'Selecciona workspace primero'}
                            disabled={!selectedWs}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Estilo SLD"
                        name="styles"
                        extra="Nombre del estilo SLD a aplicar. Vacío = estilo por defecto del workspace."
                    >
                        <AutoComplete
                            options={availableStyles.map((s) => ({ value: s }))}
                            placeholder="Vacío = estilo por defecto"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Filtro CQL"
                        name="cqlFilter"
                        extra="Filtro de tipo CQL aplicado a la capa al renderizar. Ej: modalidad = 'Con violencia'. Vacío = sin filtro."
                    >
                        <Input.TextArea rows={2} placeholder="modalidad = 'Con violencia'" />
                    </Form.Item>
                    <Form.Item
                        label="Grupo WMS"
                        name="wmsGroup"
                        extra="Capas con el mismo grupo se mergean en una sola request WMS al GeoServer (mejora performance cuando varias capas comparten estilo)."
                    >
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
                    <Form.Item
                        label="WFS disponible"
                        name="wfsAvailable"
                        valuePropName="checked"
                        extra="Permite consultar la capa via WFS (Web Feature Service) para obtener features puntuales. Necesario para infobox al hacer click."
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item
                        label="Descargable"
                        name="downloadable"
                        valuePropName="checked"
                        extra="Habilita el botón de descarga (Shapefile/CSV/GeoJSON) en el visor para esta capa."
                    >
                        <Switch />
                    </Form.Item>
                </>
            ),
        },
        {
            key: 'infobox',
            label: 'Cuadro de información',
            children: (
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Form.Item
                            label="Plantilla"
                            name="infoboxTemplate"
                            extra="Formato del cuadro que aparece al hacer click sobre una feature. 'custom' permite JSON libre para casos especiales."
                        >
                            <Select
                                allowClear
                                options={[
                                    { value: 'municipio', label: 'Municipio' },
                                    { value: 'punto', label: 'Punto' },
                                    { value: 'punto_municipio', label: 'Punto + municipio' },
                                    { value: 'punto_ubicacion', label: 'Punto + ubicación' },
                                    { value: 'punto_completo', label: 'Punto completo' },
                                    { value: 'custom', label: 'Personalizado (JSON libre)' },
                                ]}
                            />
                        </Form.Item>
                        {selectedTemplate && selectedTemplate !== 'custom' && (
                            <InfoBoxPresetForm template={selectedTemplate} />
                        )}
                        {selectedTemplate === 'custom' && (
                            <Form.Item
                                name="infoboxConfig"
                                label="Configuración JSON"
                                extra="JSON libre con la configuración del cuadro de información. Sólo para casos no cubiertos por las plantillas predefinidas."
                            >
                                <InfoBoxJsonEditor key={layer?.id} />
                            </Form.Item>
                        )}
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Vista previa</Text>
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
                    width={siderCollapsed ? 40 : siderWidth}
                    theme="light"
                    style={{
                        background: '#fff',
                        borderRight: '1px solid #f0f0f0',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'width 0.2s ease',
                    }}
                >
                    <Button
                        type="text"
                        size="small"
                        icon={siderCollapsed ? <MenuUnfoldOutlined /> : <LeftOutlined />}
                        onClick={toggleSider}
                        aria-label={siderCollapsed ? 'Mostrar árbol' : 'Ocultar árbol'}
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 4,
                            zIndex: 3,
                        }}
                    />
                    {!siderCollapsed && (
                        <>
                            <LayersTreeSider
                                treeData={treeData}
                                loading={treeLoading}
                                error={treeError}
                                selectedKey={layerId || null}
                                onSelect={handleSelectFromTree}
                                onReload={reload}
                                onReorder={reorderLayers}
                                isAdmin={isAdmin}
                                onBulkTagsClick={() => setBulkTagsOpen(true)}
                            />
                            <button
                                type="button"
                                aria-label="Redimensionar árbol"
                                onMouseDown={handleSiderResize}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: -3,
                                    bottom: 0,
                                    width: 6,
                                    cursor: 'col-resize',
                                    zIndex: 2,
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 0,
                                }}
                            />
                        </>
                    )}
                </Sider>
            )}
            <Content style={{ padding: isMobile ? 12 : 24 }}>
                {isMobile && (
                    <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 0 } }}>
                        <LayersTreeSider
                            treeData={treeData}
                            loading={treeLoading}
                            error={treeError}
                            selectedKey={layerId || null}
                            onSelect={handleSelectFromTree}
                            onReload={reload}
                            onReorder={reorderLayers}
                            isAdmin={isAdmin}
                            onBulkTagsClick={() => setBulkTagsOpen(true)}
                            showHeader
                        />
                    </Card>
                )}

                {!layerId ? (
                    <Card>
                        <Empty
                            image={<PartitionOutlined style={{ fontSize: 56, color: '#d9d9d9' }} />}
                            description={
                                <Space direction="vertical" align="center" size={4}>
                                    <Title level={4} style={{ margin: 0 }}>Editor de capas MapaLab</Title>
                                    <Paragraph type="secondary" style={{ margin: 0, maxWidth: 480, textAlign: 'center' }}>
                                        Selecciona una capa del árbol para editar sus propiedades.
                                        Los nodos hoja (Capa) son las capas WMS reales; los demás organizan la jerarquía.
                                    </Paragraph>
                                </Space>
                            }
                        />
                    </Card>
                ) : (
                    <>
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
                    </>
                )}
            </Content>

            <BulkTagsDrawer
                open={bulkTagsOpen}
                onClose={() => setBulkTagsOpen(false)}
                onDone={reload}
            />
        </Layout>
    );
}
