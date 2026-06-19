import { useEffect, useMemo, useState, useCallback } from 'react';
import { Alert, AutoComplete, Breadcrumb, Button, Card, Col, Empty, Form, Input, Result, Row, Select, Space, Spin, Switch, Tabs, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, PartitionOutlined, ReloadOutlined, SaveOutlined, SettingOutlined } from '@ant-design/icons';
import DeleteLayerModal from '@features/mapalab-layers/components/DeleteLayerModal';
import DeletedLayersList from '@features/mapalab-layers/components/DeletedLayersList';
import LayersTreeListInline from '@features/mapalab-layers/components/LayersTreeListInline';
import LayerContentDrawer from '@features/mapalab-layers/components/LayerContentDrawer';
import LayerMoveModal from '@features/mapalab-layers/components/LayerMoveModal';
import { useNavigate, useParams, useSearchParams } from 'react-router';
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
import SldEditor from '@features/mapalab-layers/components/sldEditor/SldEditor';
import StatusBadge from '@shared/components/StatusBadge';
import TemaIconField from '@features/mapalab-layers/components/layersEditor/TemaIconField';
import BulkTagsDrawer from '@features/mapalab-layers/components/layersEditor/BulkTagsDrawer';
import LayerNoticeSection from '@features/mapalab-layers/components/layersEditor/LayerNoticeSection';
import LayerBadgeSection from '@features/mapalab-layers/components/layersEditor/LayerBadgeSection';
import LayerHighlightField from '@features/mapalab-layers/components/layersEditor/LayerHighlightField';
import LayerHighlightGlobalSettings from '@features/mapalab-layers/components/LayerHighlightGlobalSettings';
import { useEventosList } from '@features/mapalab-eventos/hooks/useEventos';
import { useEventosTreeNode } from '@features/mapalab-eventos/hooks/useEventoTreeNodes';
import {
    NODE_TYPE_OPTIONS,
    NODE_TYPE_HELP,
    isFieldVisible,
    isTabVisible,
    isPropertyOfGroup,
} from '@features/mapalab-layers/constants/nodeTypes';
import MunicipioFieldPicker from '@features/mapalab-layers/components/MunicipioFieldPicker';
import { findNodeContext } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { message } from '@shared/services/message';

const { Text, Title, Paragraph } = Typography;

export default function LayerEditPage() {
    const { id: layerId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'identidad';
    const { isMobile } = useIsMobile();
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';

    const {
        treeData,
        rawTree,
        loading: treeLoading,
        error: treeError,
        reload,
        optimisticMoveParent,
        optimisticReorderChildren,
        reorderLayers,
        deleteLayer,
        restoreLayer,
        purgeLayer,
        listDeletedLayers,
        getLayerReferences,
        requestLayerDeletion,
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
        createLayer,
    } = useLayerTreeAdmin();

    const [form] = Form.useForm();
    const [layer, setLayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [saving, setSaving] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [availableStyles, setAvailableStyles] = useState([]);
    const [availableFields, setAvailableFields] = useState([]);
    const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
    const [highlightSettingsOpen, setHighlightSettingsOpen] = useState(false);
    const [eventoLayerId, setEventoLayerId] = useState(null);

    const [moveOpen, setMoveOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteReferences, setDeleteReferences] = useState(null);
    const [deleteReferencesLoading, setDeleteReferencesLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const openDeleteModal = async () => {
        if (!layerId) return;
        setDeleteModalOpen(true);
        setDeleteReferences(null);
        setDeleteReferencesLoading(true);
        try {
            const refs = await getLayerReferences(layerId);
            setDeleteReferences(refs);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron leer las referencias de la capa');
        } finally {
            setDeleteReferencesLoading(false);
        }
    };

    const handleDeleteAdmin = async ({ force }) => {
        setDeleting(true);
        try {
            await deleteLayer(layerId, { force });
            message.success('Capa archivada — puedes restaurarla desde la papelera');
            setDeleteModalOpen(false);
            await reload();
            navigate('/mapalab/layers');
        } catch (err) {
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail : detail?.message || 'No se pudo archivar la capa';
            message.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteEditor = async () => {
        setDeleting(true);
        try {
            await requestLayerDeletion(layerId);
            message.success('Solicitud de archivado enviada a revisión');
            setDeleteModalOpen(false);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo enviar la solicitud');
        } finally {
            setDeleting(false);
        }
    };


    const selectedWs = Form.useWatch('workspaceAlias', form);
    const selectedGsLayer = Form.useWatch('geoserverLayer', form);
    const selectedStyles = Form.useWatch('styles', form);
    const watchedConfig = Form.useWatch('infoboxConfig', form);
    const watchedNodeType = Form.useWatch('nodeType', form);
    const parentNodeType = useMemo(() => {
        if (!layerId || !treeData?.length) return null;
        const ctx = findNodeContext(treeData, layerId);
        return ctx?.parentNodeType ?? null;
    }, [layerId, treeData]);

    const { items: eventos } = useEventosList();
    const eventosNode = useEventosTreeNode(eventos, rawTree);
    const eventosChildren = useMemo(() => eventosNode?.children || [], [eventosNode]);
    const catalogTreeData = useMemo(
        () => (treeData || []).filter((n) => n.key !== 'eventos-auto'),
        [treeData],
    );
    const selectedEventoKey = useMemo(() => {
        if (!layerId) return null;
        if (layerId === '__eventos_root__') return layerId;
        if (layerId.startsWith('evento-')) return layerId;
        return null;
    }, [layerId]);
    const [treeTab, setTreeTab] = useState(() => {
        if (typeof window === 'undefined') return 'layers';
        return window.localStorage.getItem('mapalab.layerEditor.treeTab') || 'layers';
    });
    useEffect(() => {
        if (selectedEventoKey) setTreeTab('eventos');
    }, [selectedEventoKey]);
    const onTreeTabChange = (next) => {
        setTreeTab(next);
        window.localStorage.setItem('mapalab.layerEditor.treeTab', next);
    };
    const isProperty = isPropertyOfGroup(watchedNodeType, parentNodeType);

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
            hasMunicipio: data.hasMunicipio ?? data.has_municipio ?? data.searchMeta?.hasMunicipio ?? false,
            municipioField: data.municipioField ?? data.municipio_field ?? data.searchMeta?.municipioField ?? '',
            municipioFieldType: data.municipioFieldType ?? data.municipio_field_type ?? data.searchMeta?.municipioFieldType ?? null,
            infoboxConfig: data.infoboxConfig || null,
            iconUrl: data.iconUrl ?? data.icon_url ?? '',
            iconOverrides: data.iconOverrides ?? null,
            notice: data.notice ?? null,
            badge: data.badge ?? null,
            highlightColor: data.highlightColor ?? data.highlight_color ?? null,
            highlightShape: data.highlightShape ?? data.highlight_shape ?? null,
        });
    }, [form]);

    useEffect(() => {
        if (!layerId) return;
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        setLayer(null);
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
                if (cancelled) return;
                const status = err?.response?.status;
                const detail = err?.response?.data?.detail || err?.message || 'Error desconocido';
                setLoadError({ status, detail });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [layerId, isAdmin, getLayer, getLayerDraft, reloadKey]);

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

    const findLeafByWsLayer = (nodes, wsLayer) => {
        for (const n of nodes || []) {
            const ws = n.workspaceAlias || n.wmsConfig?.workspace;
            const lyr = n.geoserverLayer || n.wmsConfig?.geoserverLayer;
            if (n.nodeType === 'leaf' && ws && lyr && `${ws}/${lyr}` === wsLayer) return n;
            const found = n.children ? findLeafByWsLayer(n.children, wsLayer) : null;
            if (found) return found;
        }
        return null;
    };

    const handleSelectFromTree = (key) => {
        if (!key) { navigate('/mapalab/layers'); return; }
        if (key === '__eventos_root__') { navigate('/mapalab/eventos'); return; }
        const eventoMatch = /^evento-(\d+)$/.exec(key);
        if (eventoMatch) { navigate(`/mapalab/eventos/${eventoMatch[1]}/edit`); return; }
        const leafMatch = /^evento-\d+(?:-cat-\d+)?-cap-\d+-(.+)$/.exec(key);
        if (leafMatch) {
            const leaf = findLeafByWsLayer(rawTree, leafMatch[1]);
            if (leaf?.id) setEventoLayerId(leaf.id);
            return;
        }
        if (key.startsWith('evento-')) return;
        navigate(`/mapalab/layers/${encodeURIComponent(key)}/edit`);
    };

    const saveDisabled = loading || Boolean(loadError) || !layer;
    const deleteDisabled = loading || Boolean(loadError) || !layer || Boolean(layer?.deletedAt);
    const moveDisabled = loading || Boolean(loadError) || !layer || Boolean(layer?.deletedAt);

    const handleMove = async (parentId) => {
        try {
            await updateLayer(layerId, { parentId });
            message.success('Capa movida');
            optimisticMoveParent(layerId, parentId);
            setReloadKey(k => k + 1);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al mover la capa');
            throw err;
        }
    };

    const handleReorder = useCallback(async (parentId, orderedIds) => {
        optimisticReorderChildren(parentId, orderedIds);
        try {
            await reorderLayers(parentId, orderedIds);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al reordenar');
        }
    }, [optimisticReorderChildren, reorderLayers]);

    const actionButtons = layerId && (
        <Space size={4} wrap>
            {isAdmin && (
                <Tooltip title="Mover esta capa a otro tema o categoría">
                    <Button
                        size="small"
                        icon={<PartitionOutlined />}
                        disabled={moveDisabled}
                        onClick={() => setMoveOpen(true)}
                    >
                        Mover
                    </Button>
                </Tooltip>
            )}
            <Tooltip title={isAdmin ? 'Archivar capa (soft delete)' : 'Solicitar archivado a un admin'}>
                <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    disabled={deleteDisabled}
                    onClick={openDeleteModal}
                >
                    {isAdmin ? 'Archivar' : 'Solicitar'}
                </Button>
            </Tooltip>
            {isAdmin ? (
                <Tooltip title={loadError ? 'Datos no cargados — no es seguro guardar' : ''}>
                    <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} disabled={saveDisabled} onClick={handleSaveDirect}>
                        Guardar
                    </Button>
                </Tooltip>
            ) : (
                <Tooltip title={loadError ? 'Datos no cargados — no es seguro guardar' : ''}>
                    <Space size={4}>
                        <Button size="small" loading={saving} disabled={saveDisabled} onClick={handleSaveDraft}>
                            Borrador
                        </Button>
                        <Button size="small" type="primary" loading={saving} disabled={saveDisabled} onClick={handleSubmitReview}>
                            Revisión
                        </Button>
                    </Space>
                </Tooltip>
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
            forceRender: true,
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
                        extra={
                            isProperty
                                ? 'Este nodo es una Propiedad: comparte feature type con su grupo padre y se enciende cuando se enciende el grupo. No se puede cambiar de tipo desde aquí.'
                                : 'Rol del nodo en la jerarquía: Tema/Categoría/Etiqueta/Grupo organizan; Capa es la capa WMS real.'
                        }
                    >
                        <Select options={NODE_TYPE_OPTIONS} disabled={isProperty} />
                    </Form.Item>
                    {isProperty && (
                        <Alert closable
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                            message="Estás editando una Propiedad"
                            description={`Las propiedades comparten feature type, simbología, metadatos y numeralia con su grupo padre (todo se almacena por feature type, no por propiedad). Solo se distinguen entre hermanas por su CQL filter. Cambia el "Filtro CQL" en la pestaña Servicios para ajustar qué features se incluyen en esta propiedad. La metadata, numeralia y simbología se editan una sola vez en el grupo padre.`}
                        />
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
                    {isFieldVisible('municipioFilter', watchedNodeType) && (
                        <>
                            <Form.Item
                                label="Filtro por municipio"
                                name="hasMunicipio"
                                valuePropName="checked"
                                extra="Si está activa, la capa se filtra por municipio en el visor usando el campo declarado abajo. Si no, cae en filtro espacial BBOX (rectángulo)."
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.hasMunicipio !== cur.hasMunicipio}>
                                {({ getFieldValue }) => getFieldValue('hasMunicipio') && (
                                    <MunicipioFieldPicker
                                        workspaceAlias={selectedWs}
                                        geoserverLayer={selectedGsLayer}
                                        listFields={listGeoserverFields}
                                        form={form}
                                        rawTree={rawTree}
                                        layerId={layerId}
                                    />
                                )}
                            </Form.Item>
                        </>
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
            key: 'apariencia',
            forceRender: true,
            label: 'Apariencia',
            children: (
                <Space orientation="vertical" size="middle" style={{ width: '100%', maxWidth: 720 }}>
                    {watchedNodeType === 'tema' && (
                        <Card size="small" title="Iconos por estado" extra={<Text type="secondary" style={{ fontSize: 11 }}>Aparece en el sider del visor</Text>}>
                            <Form.Item name="iconOverrides" noStyle>
                                <TemaIconField />
                            </Form.Item>
                        </Card>
                    )}
                    {watchedNodeType !== 'tema' && (
                        <Card
                            size="small"
                            title="Resaltado al hacer clic en una feature"
                            extra={<Text type="secondary" style={{ fontSize: 11 }}>{watchedNodeType === 'leaf' ? 'Aplica a esta capa' : 'Se propaga a las capas hijas que no tengan su propio resaltado'}</Text>}
                        >
                            <LayerHighlightField />
                        </Card>
                    )}
                </Space>
            ),
        },
        {
            key: 'servicios',
            forceRender: true,
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
            forceRender: true,
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
                        <div style={{ position: 'sticky', top: 0 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Vista previa</Text>
                            <InfoBoxPreview
                                value={watchedConfig || inheritedInfobox?.config || null}
                            />
                        </div>
                    </Col>
                </Row>
            ),
        },
        {
            key: 'aviso',
            forceRender: true,
            label: 'Aviso',
            children: (() => {
                const wsObj = workspaces.find((w) => w.alias === selectedWs);
                const resolvedWs = wsObj?.geoserverWorkspace || selectedWs || null;
                const selectedCqlFilter = form.getFieldValue('cqlFilter') || '';
                const layerDefaultZoom = form.getFieldValue('defaultZoom') || null;
                return (
                    <Form.Item
                        name="notice"
                        label={null}
                        valuePropName="value"
                        trigger="onChange"
                    >
                        <LayerNoticeSection
                            geoserverWorkspace={resolvedWs}
                            geoserverLayer={selectedGsLayer || null}
                            styles={(Array.isArray(selectedStyles) ? selectedStyles.join(',') : selectedStyles) || ''}
                            cqlFilter={selectedCqlFilter}
                            defaultZoom={layerDefaultZoom}
                        />
                    </Form.Item>
                );
            })(),
        },
        {
            key: 'badge',
            forceRender: true,
            label: 'Badge',
            children: (
                <Form.Item
                    name="badge"
                    label={null}
                    valuePropName="value"
                    trigger="onChange"
                >
                    <LayerBadgeSection />
                </Form.Item>
            ),
        },
        {
            key: 'metadatos',
            forceRender: true,
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
        {
            key: 'simbologia',
            forceRender: true,
            label: (
                <>
                    Simbología
                    <StatusBadge
                        variant="beta"
                        size="sm"
                        style={{
                            position: 'absolute',
                            top: 0,
                            right: -20,
                        }}
                    />
                </>
            ),
            children: layer ? (
                <SldEditor
                    layer={layer}
                    derivedFeatureType={
                        sharedFeatureTypeFromDescendants?.layerKey
                            ? sharedFeatureTypeFromDescendants
                            : null
                    }
                />
            ) : null,
        },
    ]
        .filter((tab) => tab.key === 'identidad' || isTabVisible(tab.key, watchedNodeType))
        .filter((tab) => !(isProperty && (tab.key === 'simbologia' || tab.key === 'metadatos')));

    const nodeHelp = NODE_TYPE_HELP[watchedNodeType];

    const editorBody = !layerId ? null : loading ? (
        <Spin style={{ display: 'block', margin: '48px auto' }} size="large" />
    ) : loadError ? (
        <Result
            status={loadError.status === 404 ? '404' : 'error'}
            title={loadError.status === 404 ? 'Capa no encontrada' : 'No se pudo cargar la capa'}
            subTitle={
                <Space orientation="vertical" size={4}>
                    <Text type="secondary">{loadError.detail}</Text>
                    <Text type="warning" style={{ fontSize: 12 }}>
                        No edites todavía: los datos no se cargaron y guardar sobrescribiría el registro con valores en blanco.
                    </Text>
                </Space>
            }
            extra={[
                <Button key="retry" type="primary" icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)}>Reintentar</Button>,
                <Button key="back" onClick={() => navigate('/mapalab/layers')}>Volver al árbol</Button>,
            ]}
        />
    ) : (
        <Form form={form} layout="vertical">
            {nodeHelp && (
                <div style={{ background: '#E6F4FF', border: '1px solid #91CAFF', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 2 }}>{nodeHelp.title}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{nodeHelp.body}</Text>
                </div>
            )}
            <Tabs defaultActiveKey={initialTab} items={tabItems} tabPosition="top" style={{ minHeight: 400 }} />
        </Form>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
            <div style={{ padding: isMobile ? '8px 8px 0' : '24px 24px 0', flexShrink: 0 }}>
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Capas MapaLab</Title>
                    <Tooltip title="Configuración global del resaltado de features">
                        <Button
                            icon={<SettingOutlined />}
                            onClick={() => setHighlightSettingsOpen(true)}
                            shape="circle"
                            aria-label="Configuración global del resaltado"
                        />
                    </Tooltip>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Árbol del visor. Click sobre un nodo para abrir el editor inline; click sobre el triángulo para expandir/colapsar la rama.
                </Text>
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: isMobile ? 6 : 24, paddingBottom: layerId ? (isMobile ? 6 : 12) : (isMobile ? 6 : 24), overflow: 'hidden' }}>
                <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }} styles={{ body: { padding: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}>
                    <style>{`
                        .layers-tree-tabs { height: 100%; display: flex; flex-direction: column; min-height: 0; }
                        .layers-tree-tabs > .ant-tabs-content-holder { flex: 1; min-height: 0; overflow: hidden; }
                        .layers-tree-tabs > .ant-tabs-content-holder > .ant-tabs-content { height: 100%; }
                        .layers-tree-tabs .ant-tabs-tabpane { height: 100%; overflow: hidden; }
                    `}</style>
                    <Tabs
                        className="layers-tree-tabs"
                        activeKey={treeTab}
                        onChange={onTreeTabChange}
                        size="small"
                        tabBarStyle={{ padding: '0 12px', marginBottom: 0, flexShrink: 0 }}
                        items={[
                            {
                                key: 'layers',
                                label: `Capas (${catalogTreeData?.length || 0})`,
                                children: (
                                    <LayersTreeListInline
                                        treeData={catalogTreeData}
                                        loading={treeLoading}
                                        error={treeError}
                                        selectedKey={selectedEventoKey ? null : (layerId || null)}
                                        onSelect={handleSelectFromTree}
                                        onReload={reload}
                                        onCreate={createLayer}
                                        isAdmin={isAdmin}
                                        onBulkTagsClick={() => setBulkTagsOpen(true)}
                                        onReorder={isAdmin ? handleReorder : null}
                                        editorContent={layerId && !selectedEventoKey ? editorBody : null}
                                        actionButtons={layerId && !selectedEventoKey ? actionButtons : null}
                                    />
                                ),
                            },
                            {
                                key: 'eventos',
                                label: `Eventos (${eventos?.length || 0})`,
                                children: eventosChildren.length === 0 ? (
                                    <div style={{ padding: 24 }}>
                                        <Empty
                                            description="Sin eventos publicados"
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        >
                                            <Button type="primary" onClick={() => navigate('/mapalab/eventos')}>
                                                Ir al editor de eventos
                                            </Button>
                                        </Empty>
                                    </div>
                                ) : (
                                    <LayersTreeListInline
                                        treeData={eventosChildren}
                                        loading={treeLoading}
                                        error={treeError}
                                        selectedKey={selectedEventoKey}
                                        onSelect={handleSelectFromTree}
                                        isAdmin={false}
                                        onReorder={null}
                                    />
                                ),
                            },
                            {
                                key: 'papelera',
                                label: 'Papelera',
                                children: (
                                    <DeletedLayersList
                                        isAdmin={isAdmin}
                                        listDeleted={listDeletedLayers}
                                        onRestore={restoreLayer}
                                        onPurge={purgeLayer}
                                        onAfterAction={reload}
                                    />
                                ),
                            },
                        ]}
                    />
                </Card>
            </div>

            <LayerContentDrawer
                open={!!eventoLayerId}
                layerId={eventoLayerId}
                onClose={() => setEventoLayerId(null)}
                onSaved={reload}
            />

            <BulkTagsDrawer
                open={bulkTagsOpen}
                onClose={() => setBulkTagsOpen(false)}
                onDone={reload}
            />

            <LayerHighlightGlobalSettings
                open={highlightSettingsOpen}
                onClose={() => { setHighlightSettingsOpen(false); reload(); }}
                treeData={treeData}
            />

            <DeleteLayerModal
                open={deleteModalOpen}
                onClose={() => (deleting ? null : setDeleteModalOpen(false))}
                layer={layer}
                isAdmin={isAdmin}
                references={deleteReferences}
                referencesLoading={deleteReferencesLoading}
                onConfirmAdmin={handleDeleteAdmin}
                onConfirmEditor={handleDeleteEditor}
                submitting={deleting}
            />
            <LayerMoveModal
                open={moveOpen}
                onClose={() => setMoveOpen(false)}
                onSubmit={handleMove}
                treeData={treeData}
                layerId={layerId}
                layerLabel={layer?.label}
                currentParentId={layer?.parentId ?? null}
            />
        </div>
    );
}
