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
import InfoBoxBlocksEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxBlocksEditor';
import InfoBoxPreview from '@features/mapalab-layers/components/layersEditor/InfoBoxPreview';
import LayerMetadataSection from '@features/mapalab-layers/components/layersEditor/LayerMetadataSection';
import LayerAliasesSection from '@features/mapalab-layers/components/layersEditor/LayerAliasesSection';
import CqlFilterBuilder from '@features/mapalab-layers/components/layersEditor/CqlFilterBuilder';
import WmsGroupField from '@features/mapalab-layers/components/layersEditor/WmsGroupField';
import GroupServicesReference from '@features/mapalab-layers/components/layersEditor/GroupServicesReference';
import LayersTreeSider from '@features/mapalab-layers/components/LayersTreeSider';
import TemaIconField from '@features/mapalab-layers/components/layersEditor/TemaIconField';
import BulkTagsDrawer from '@features/mapalab-layers/components/layersEditor/BulkTagsDrawer';
import {
    NODE_TYPE_OPTIONS,
    NODE_TYPE_HELP,
    isFieldVisible,
    isTabVisible,
} from '@features/mapalab-layers/constants/nodeTypes';
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
        listGeoserverFields,
        listLayerAliases,
        createLayerAlias,
        deleteLayerAlias,
        suggestSlug,
        reorderLayers,
        createLayer,
    } = useLayerTreeAdmin();

    const [form] = Form.useForm();
    const [layer, setLayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [availableStyles, setAvailableStyles] = useState([]);
    const [availableFields, setAvailableFields] = useState([]);
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
    const selectedStyles = Form.useWatch('styles', form);
    const watchedConfig = Form.useWatch('infoboxConfig', form);
    const watchedNodeType = Form.useWatch('nodeType', form);

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

    useEffect(() => {
        if (!selectedWs || !selectedGsLayer) {
            setAvailableFields([]);
            return;
        }
        let cancelled = false;
        listGeoserverFields(selectedWs, selectedGsLayer)
            .then((data) => { if (!cancelled) setAvailableFields(data?.fields || []); })
            .catch(() => { if (!cancelled) setAvailableFields([]); });
        return () => { cancelled = true; };
    }, [selectedWs, selectedGsLayer, listGeoserverFields]);

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
            timeEnabled: data.timeEnabled,
            defaultDate: data.defaultDate ?? data.default_date ?? null,
            timeStylePattern: data.timeStylePattern ?? data.time_style_pattern ?? '',
            hidePeriodicity: data.hidePeriodicity ?? data.hide_periodicity ?? false,
            searchTags: data.searchTags || data.search_tags || data.searchMeta?.tags || [],
            infoboxConfig: data.infoboxConfig || null,
            iconUrl: data.iconUrl ?? data.icon_url ?? '',
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
                        return;
                    }
                }
                setLayer(fresh);
            } catch (err) {
                message.error(err?.response?.data?.detail || 'No se pudo cargar la capa');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [layerId, isAdmin, getLayer, getLayerDraft]);

    useEffect(() => {
        if (loading || !layer) return;
        populate(layer);
    }, [loading, layer, populate]);

    const buildPayload = async () => {
        const values = await form.validateFields();
        const raw = values.searchTags;
        const tagsArray = Array.isArray(raw)
            ? raw
            : (raw || '').split(',').map((t) => t.trim()).filter(Boolean);
        const { infoboxTemplate: _omitTpl, infoboxParams: _omitParams, ...rest } = values;
        return { ...rest, searchTags: tagsArray };
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

    const workspaceOptions = (() => {
        const opts = workspaces.map((w) => ({
            value: w.alias,
            label: `${w.label || w.alias} (${w.layers?.length || 0} capas)`,
        }));
        if (selectedWs && !opts.find((o) => o.value === selectedWs)) {
            opts.unshift({ value: selectedWs, label: selectedWs });
        }
        return opts;
    })();

    const layerOptions = (() => {
        const opts = availableLayers.map((l) => ({ value: l }));
        if (selectedGsLayer && !opts.find((o) => o.value === selectedGsLayer)) {
            opts.unshift({ value: selectedGsLayer });
        }
        return opts;
    })();

    const breadcrumbPath = (() => {
        if (!layerId || !treeData?.length) return [];
        const find = (nodes, target, path) => {
            for (const n of nodes) {
                const next = [...path, n];
                if (n.key === target) return next;
                if (n.children?.length) {
                    const found = find(n.children, target, next);
                    if (found) return found;
                }
            }
            return null;
        };
        return find(treeData, layerId, []) || [];
    })();

    const countSiblingsSharingFeatureType = (featureKey) => {
        if (!featureKey || !treeData?.length) return 0;
        let count = 0;
        const visit = (nodes) => {
            for (const n of nodes) {
                if (n.key !== layerId) {
                    const wms = n.raw?.wmsConfig || {};
                    const ws = wms.workspace || n.raw?.workspaceAlias;
                    const gl = wms.geoserverLayer || n.raw?.geoserverLayer;
                    if (ws && gl && `${ws}:${gl}` === featureKey) count++;
                }
                if (n.children?.length) visit(n.children);
            }
        };
        visit(treeData);
        return count;
    };

    const sharedFeatureTypeFromDescendants = (() => {
        const currentNode = breadcrumbPath[breadcrumbPath.length - 1];
        if (!currentNode) return null;
        const featureTypes = new Set();
        const visit = (node) => {
            const raw = node?.raw || {};
            const wms = raw.wmsConfig || {};
            const ws = wms.workspace || raw.workspaceAlias || raw.workspace_alias;
            const gl = wms.geoserverLayer || raw.geoserverLayer || raw.geoserver_layer;
            if (ws && gl) featureTypes.add(`${ws}:${gl}`);
            if (node.children?.length) node.children.forEach(visit);
        };
        if (currentNode.children?.length) currentNode.children.forEach(visit);
        if (featureTypes.size === 1) {
            const [ft] = featureTypes;
            const [ws, gl] = ft.split(':');
            return { layerKey: ft, workspace: ws, geoserverLayer: gl, count: featureTypes.size };
        }
        if (featureTypes.size > 1) {
            return { layerKey: null, multiple: Array.from(featureTypes) };
        }
        return null;
    })();

    const inheritedInfobox = (() => {
        if (!breadcrumbPath.length) return null;
        for (let i = breadcrumbPath.length - 2; i >= 0; i--) {
            const ancestor = breadcrumbPath[i];
            const raw = ancestor?.raw || {};
            if (raw.nodeType !== 'group') continue;
            const cfg = raw.infoboxConfig || raw.infobox_config || raw.littleCard;
            if (cfg) return { id: ancestor.key, label: ancestor.title, config: cfg };
        }
        return null;
    })();

    const styleOptions = (() => {
        const opts = availableStyles.map((s) => ({ value: s }));
        if (selectedStyles && !opts.find((o) => o.value === selectedStyles)) {
            opts.unshift({ value: selectedStyles });
        }
        return opts;
    })();

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
                    {isFieldVisible('slug', watchedNodeType) && (
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
                    )}
                    {isFieldVisible('alias', watchedNodeType) && (
                        <Form.Item label="Alias (atajos opcionales)">
                            <LayerAliasesSection
                                layerId={layerId}
                                listAliases={listLayerAliases}
                                createAlias={createLayerAlias}
                                deleteAlias={deleteLayerAlias}
                            />
                        </Form.Item>
                    )}
                    <Form.Item
                        label="Tipo de nodo"
                        name="nodeType"
                        extra="Rol del nodo en la jerarquía: Tema/Categoría/Etiqueta/Grupo organizan; Capa es la capa WMS real."
                    >
                        <Select options={NODE_TYPE_OPTIONS} />
                    </Form.Item>
                    {watchedNodeType === 'tema' && (
                        <Form.Item
                            label="Icono"
                            name="iconUrl"
                            extra="Icono SVG/PNG mostrado en el sider del visor para este tema."
                        >
                            <TemaIconField />
                        </Form.Item>
                    )}
                    {isFieldVisible('searchTags', watchedNodeType) && (
                        <Form.Item
                            label="Etiquetas de búsqueda"
                            name="searchTags"
                            normalize={(values) =>
                                Array.isArray(values)
                                    ? Array.from(
                                        new Set(
                                            values
                                                .map((v) => String(v).toLowerCase().trim())
                                                .filter(Boolean),
                                        ),
                                    )
                                    : values
                            }
                            extra="Palabras clave adicionales para filtrar la capa en el buscador del visor. Escribe y presiona espacio, coma o Enter para crear cada etiqueta. Se normalizan a minúsculas."
                        >
                            <Select
                                mode="tags"
                                tokenSeparators={[' ', ',']}
                                placeholder="seguridad delito feminicidio"
                                style={{ width: '100%' }}
                                open={false}
                                suffixIcon={null}
                                tagRender={({ label, closable, onClose }) => (
                                    <Tag
                                        color="#FF8300"
                                        closable={closable}
                                        onClose={onClose}
                                        style={{
                                            margin: '3px 4px 3px 0',
                                            fontSize: 14,
                                            color: '#262626',
                                            padding: '2px 10px',
                                            borderRadius: 6,
                                        }}
                                    >
                                        {label}
                                    </Tag>
                                )}
                            />
                        </Form.Item>
                    )}
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
            key: 'servicios',
            label: 'Servicios',
            children: watchedNodeType === 'group' && !selectedWs ? (
                <GroupServicesReference groupId={layerId} treeData={treeData} />
            ) : (
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
                            options={workspaceOptions}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Capa de GeoServer"
                        name="geoserverLayer"
                        extra="Nombre técnico de la capa en GeoServer (sin prefijo de workspace). Debe existir en el workspace seleccionado."
                    >
                        <AutoComplete
                            options={layerOptions}
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
                            options={styleOptions}
                            placeholder="Vacío = estilo por defecto"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Filtro CQL"
                        name="cqlFilter"
                        extra="Filtro de tipo CQL aplicado a la capa al renderizar. El constructor arma condiciones campo/operador/valor con los atributos reales de la capa; usa 'Texto avanzado' para CQL más complejo."
                    >
                        <CqlFilterBuilder
                            workspaceAlias={selectedWs}
                            geoserverLayer={selectedGsLayer}
                            listFields={listGeoserverFields}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Grupo WMS"
                        name="wmsGroup"
                        extra="Capas con el mismo grupo se mergean en una sola request WMS al GeoServer (mejora performance cuando varias capas comparten estilo). Lo más seguro es agruparlas con sus hermanas directas en el árbol."
                    >
                        <WmsGroupField
                            layerId={layerId}
                            treeData={treeData}
                            workspaceAlias={selectedWs}
                            timeEnabled={layer?.timeEnabled}
                        />
                    </Form.Item>

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

                    <Form.Item
                        label="Soporte temporal (timeEnabled)"
                        name="timeEnabled"
                        valuePropName="checked"
                        extra="Activa filtros temporales en GeoServer (capas con dimensión TIME). Suele usarse en rásters publicados como ImageMosaic donde GeoServer expone la fecha como dimensión nativa (ej. mosaicos mensuales/anuales de temperatura, precipitación, NDVI). En vectoriales también funciona si la capa tiene un campo TIME indexado."
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item
                        label="Fecha por defecto"
                        name="defaultDate"
                        normalize={(v) => {
                            if (v === undefined || v === null || v === '') return null;
                            if (v === 'latest') return 'latest';
                            const num = Number(v);
                            return Number.isFinite(num) ? { year: num } : v;
                        }}
                        getValueProps={(v) => {
                            if (v === null || v === undefined) return { value: '' };
                            if (v === 'latest') return { value: 'latest' };
                            if (typeof v === 'object' && v.year) return { value: String(v.year) };
                            return { value: String(v) };
                        }}
                        extra="Año específico (ej. 2024), o 'latest' para usar la más reciente disponible."
                    >
                        <Input placeholder="2024 o latest" />
                    </Form.Item>
                    <Form.Item
                        label="Patrón de estilo temporal (timeStylePattern)"
                        name="timeStylePattern"
                        extra="Plantilla de nombre de estilo SLD que cambia según la fecha. Ej: poblacion_{year}."
                    >
                        <Input placeholder="poblacion_{year}" />
                    </Form.Item>
                    <Form.Item
                        label="Ocultar selector de periodicidad"
                        name="hidePeriodicity"
                        valuePropName="checked"
                        extra="Si está activo, el visor no muestra el control de fechas para esta capa aunque exista soporte temporal."
                    >
                        <Switch />
                    </Form.Item>
                </>
            ),
        },
        {
            key: 'infobox',
            label: 'Tarjeta',
            children: (
                <Row gutter={24}>
                    <Col xs={24} md={14}>
                        <Form.Item
                            name="infoboxConfig"
                            label="Configuración del cuadro"
                            extra="Bloques que componen el cuadro que aparece al hacer click sobre una feature en el visor. Cada bloque (encabezado, etiquetas, cards, lista, íconos, texto) se puede agregar o quitar según necesites."
                        >
                            <InfoBoxBlocksEditor
                                availableFields={availableFields}
                                inherited={inheritedInfobox}
                                nodeType={watchedNodeType}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Vista previa</Text>
                        <InfoBoxPreview
                            value={watchedConfig || inheritedInfobox?.config || null}
                        />
                    </Col>
                </Row>
            ),
        },
        {
            key: 'metadatos',
            label: 'Metadatos',
            children: layer ? (() => {
                const ownFeatureType = layer.workspaceAlias && layer.geoserverLayer
                    ? { layerKey: `${layer.workspaceAlias}:${layer.geoserverLayer}`, workspace: layer.workspaceAlias, geoserverLayer: layer.geoserverLayer, derived: false }
                    : null;
                const derived = !ownFeatureType && sharedFeatureTypeFromDescendants?.layerKey
                    ? { ...sharedFeatureTypeFromDescendants, derived: true }
                    : null;
                const metaCtx = ownFeatureType || derived;
                if (!metaCtx) {
                    return (
                        <Empty description={
                            sharedFeatureTypeFromDescendants?.multiple
                                ? `Este nodo agrupa capas con feature types distintos (${sharedFeatureTypeFromDescendants.multiple.join(', ')}). Los metadatos se editan en cada feature type por separado.`
                                : 'Este nodo no tiene feature type propio ni descendientes con uno común. No hay metadatos que editar aquí.'
                        } />
                    );
                }
                return (
                    <LayerMetadataSection
                        layerKey={metaCtx.layerKey}
                        workspace={metaCtx.workspace}
                        geoserverLayer={metaCtx.geoserverLayer}
                        availableFields={availableFields}
                        derivedFromDescendants={metaCtx.derived}
                        siblingsSharingCount={ownFeatureType ? countSiblingsSharingFeatureType(metaCtx.layerKey) : 0}
                    />
                );
            })() : null,
        },
    ].filter((tab) => tab.key === 'identidad' || isTabVisible(tab.key, watchedNodeType));

    const nodeHelp = NODE_TYPE_HELP[watchedNodeType];

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
                    <div style={{ display: siderCollapsed ? 'none' : 'block', height: '100%' }}>
                        <LayersTreeSider
                            treeData={treeData}
                            loading={treeLoading}
                            error={treeError}
                            selectedKey={layerId || null}
                            onSelect={handleSelectFromTree}
                            onReload={reload}
                            onReorder={reorderLayers}
                            onCreate={createLayer}
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
                    </div>
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
                            onCreate={createLayer}
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
                                <Space orientation="vertical" align="center" size={4}>
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
                                    ...breadcrumbPath.slice(0, -1).map((n) => ({
                                        title: (
                                            <Button
                                                type="link"
                                                size="small"
                                                style={{ padding: 0 }}
                                                onClick={() => navigate(`/mapalab/layers/${encodeURIComponent(n.key)}/edit`)}
                                            >
                                                {n.title}
                                            </Button>
                                        ),
                                    })),
                                    { title: breadcrumbPath.at(-1)?.title || layer?.label || layerId },
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
                                    {nodeHelp && (
                                        <div style={{
                                            background: '#E6F4FF',
                                            border: '1px solid #91CAFF',
                                            borderRadius: 6,
                                            padding: '8px 12px',
                                            marginBottom: 16,
                                        }}>
                                            <Text strong style={{ display: 'block', marginBottom: 2 }}>
                                                {nodeHelp.title}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {nodeHelp.body}
                                            </Text>
                                        </div>
                                    )}
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
