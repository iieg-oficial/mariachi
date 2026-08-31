import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Alert, AutoComplete, Button, Card, Drawer, Empty, Form, Input, Result, Segmented, Select, Space, Spin, Switch, Tabs, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, HistoryOutlined, PartitionOutlined, PlusOutlined, ReloadOutlined, SettingOutlined, SlidersOutlined, TableOutlined } from '@ant-design/icons';
import DeleteLayerModal from '@features/mapalab-layers/components/DeleteLayerModal';
import DeletedLayersList from '@features/mapalab-layers/components/DeletedLayersList';
import LayersTreeListInline from '@features/mapalab-layers/components/LayersTreeListInline';
import LayerContentDrawer from '@features/mapalab-layers/components/LayerContentDrawer';
import LayerMoveModal from '@features/mapalab-layers/components/LayerMoveModal';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import useIsMobile from '@shared/hooks/useIsMobile';
import { useAuth } from '@shared/contexts/useAuth';
import InfoBoxEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxEditor';
import InfoBoxEditorHeader from '@features/mapalab-layers/components/layersEditor/InfoBoxEditorHeader';
import InfoBoxPreviewPanel from '@features/mapalab-layers/components/layersEditor/InfoBoxPreviewPanel';
import { SampleFeaturesProvider } from '@features/mapalab-layers/components/layersEditor/SampleFeaturesContext';
import LayerMetadataSection from '@features/mapalab-layers/components/layersEditor/LayerMetadataSection';
import LayerStatsSection from '@features/mapalab-layers/components/layersEditor/LayerStatsSection';
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
    ADVANCED_TABS,
    ADVANCED_TAB_TITLES,
    NODE_TYPE_OPTIONS,
    PRIMARY_TABS,
    isFieldVisible,
    isTabVisible,
    isPropertyOfGroup,
    helpForNode,
    labelForNode,
} from '@features/mapalab-layers/constants/nodeTypes';
import AdvancedStack from '@features/mapalab-layers/components/layersEditor/AdvancedStack';
import EditorSection from '@features/mapalab-layers/components/layersEditor/EditorSection';
import LayerBreadcrumb from '@features/mapalab-layers/components/LayerBreadcrumb';
import TreeSearchInput from '@features/mapalab-layers/components/TreeSearchInput';
import PublishReviewModal from '@features/mapalab-layers/components/PublishReviewModal';
import GridHistoryDrawer from '@shared/components/dataGrid/GridHistoryDrawer';
import useLayerDrafts from '@features/mapalab-layers/hooks/useLayerDrafts';
import { HISTORY_COLUMNS, diffPayload } from '@features/mapalab-layers/utils/layerDiff';
import { findPath } from '@features/mapalab-layers/utils/treeSearch';
import { isOrganizer } from '@features/mapalab-layers/constants/nodeVisuals';
import { GEOMETRY_TYPE_OPTIONS } from '@features/mapalab-layers/constants/layerConfigCatalogs';
import MunicipioFieldPicker from '@features/mapalab-layers/components/MunicipioFieldPicker';
import { findNodeContext } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { message } from '@shared/services/message';

const { Text, Title, Paragraph } = Typography;

export default function LayerEditPage() {
    const { id: layerId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const requestedTab = searchParams.get('tab') || 'identidad';
    const requestedAdvanced = ADVANCED_TABS.includes(requestedTab);
    const initialTab = PRIMARY_TABS.includes(requestedTab) ? requestedTab : 'identidad';
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
        discardDraft,
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
    const [workspaces, setWorkspaces] = useState([]);
    const [availableStyles, setAvailableStyles] = useState([]);
    const [availableFields, setAvailableFields] = useState([]);
    const [fieldsLoading, setFieldsLoading] = useState(false);
    const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
    const [highlightSettingsOpen, setHighlightSettingsOpen] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(requestedAdvanced);
    const [treeQuery, setTreeQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [autosaveAt, setAutosaveAt] = useState(null);
    const autosaveTimer = useRef(null);
    const { drafts, pendingCount, reload: reloadDrafts } = useLayerDrafts();
    const shellRef = useRef(null);
    const [baseline, setBaseline] = useState(null);
    const [shellHeight, setShellHeight] = useState(null);
    const [eventoLayerId, setEventoLayerId] = useState(null);
    const [infoboxMode, setInfoboxMode] = useState('visual');

    const [moveOpen, setMoveOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteReferences, setDeleteReferences] = useState(null);
    const [deleteReferencesLoading, setDeleteReferencesLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useLayoutEffect(() => {
        const medir = () => {
            const el = shellRef.current;
            if (!el) return;
            const top = el.getBoundingClientRect().top;
            const holgura = isMobile ? 12 : 48;
            setShellHeight(Math.max(360, window.innerHeight - top - holgura));
        };
        medir();
        window.addEventListener('resize', medir);
        return () => window.removeEventListener('resize', medir);
    }, [isMobile]);

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

    const handleDeleteAdmin = async ({ force, cascade }) => {
        setDeleting(true);
        try {
            const res = await deleteLayer(layerId, { force, cascade });
            const total = res?.archived?.length || 1;
            message.success(total > 1
                ? `${total} nodos archivados — puedes restaurarlos desde la papelera`
                : 'Capa archivada — puedes restaurarla desde la papelera');
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


    const watchedLabel = Form.useWatch('label', form);
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
            setFieldsLoading(false);
            return;
        }
        let cancelled = false;
        setFieldsLoading(true);
        listGeoserverFields(selectedWs, selectedGsLayer)
            .then((data) => { if (!cancelled) setAvailableFields(data?.fields || []); })
            .catch(() => { if (!cancelled) setAvailableFields([]); })
            .finally(() => { if (!cancelled) setFieldsLoading(false); });
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
            tiled: data.tiled ?? true,
            imageFormat: data.imageFormat ?? data.image_format ?? 'image/png',
            antialias: data.antialias ?? 'text',
            wfsAvailable: data.wfsAvailable,
            geometryType: data.geometryType ?? data.geometry_type ?? null,
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
        setBaseline(form.getFieldsValue());
    }, [loading, layer, populate, form]);





    const scheduleAutosave = useCallback(() => {
        if (!layerId || loading || loadError) return;
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(async () => {
            try {
                if (!baseline) return;
                const values = form.getFieldsValue();
                const { infoboxTemplate: _t, infoboxParams: _p, ...rest } = values;
                const cambios = diffPayload(rest, baseline);
                if (Object.keys(cambios).length === 0) return;
                await saveLayerDraft(layerId, cambios);
                setAutosaveAt(new Date());
                reloadDrafts();
            } catch { /* el borrador se reintenta al siguiente cambio */ }
        }, 1500);
    }, [layerId, loading, loadError, form, baseline, saveLayerDraft, reloadDrafts]);

    useEffect(() => () => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    }, []);

    const layerTitles = useMemo(() => {
        const acc = {};
        const walk = (nodes) => (nodes || []).forEach((n) => {
            acc[n.key] = n.title;
            if (n.children?.length) walk(n.children);
        });
        walk(treeData);
        return acc;
    }, [treeData]);

    const handleDiscard = async () => {
        setPublishing(true);
        try {
            await Promise.all(drafts.map((d) => discardDraft(d.id)));
            message.success('Borradores descartados');
            setReviewOpen(false);
            await reloadDrafts();
            setReloadKey((k) => k + 1);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron descartar los borradores');
        } finally {
            setPublishing(false);
        }
    };

    const handlePublish = async (rows) => {
        setPublishing(true);
        try {
            const porCapa = new Map();
            rows.forEach((row) => {
                if (!porCapa.has(row.layerId)) porCapa.set(row.layerId, {});
                porCapa.get(row.layerId)[row.field] = row.value;
            });
            for (const [id, payload] of porCapa.entries()) {
                if (isAdmin) {
                    await updateLayer(id, payload);
                } else {
                    await saveLayerDraft(id, payload);
                    await requestReview(id);
                }
            }
            if (isAdmin) {
                await Promise.all(
                    [...new Set(rows.map((r) => r.draftId))].map((id) => discardDraft(id)),
                );
            }
            message.success(isAdmin ? 'Cambios publicados' : 'Cambios enviados a revisión');
            setReviewOpen(false);
            await reloadDrafts();
            await reload();
            setReloadKey((k) => k + 1);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron publicar los cambios');
        } finally {
            setPublishing(false);
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
        <Button size="small" icon={<SlidersOutlined />} onClick={() => setAdvancedOpen(true)}>
            Avanzado
        </Button>
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

    const noticeWorkspace = workspaces.find((w) => w.alias === selectedWs)?.geoserverWorkspace || selectedWs || null;

    const ownFeatureType = layer?.workspaceAlias && layer?.geoserverLayer
        ? { layerKey: `${layer.workspaceAlias}:${layer.geoserverLayer}`, workspace: layer.workspaceAlias, geoserverLayer: layer.geoserverLayer, derived: false }
        : null;
    const derivedFeatureType = !ownFeatureType && sharedFeatureTypeFromDescendants?.layerKey
        ? { ...sharedFeatureTypeFromDescendants, derived: true }
        : null;
    const featureTypeContext = ownFeatureType || derivedFeatureType;

    const allTabs = [
        {
            key: 'identidad',
            forceRender: true,
            label: 'Identidad',
            children: (
                <>
                    <EditorSection title="Nombre y acceso" first>
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
                    </EditorSection>
                    <EditorSection title="Búsqueda en el visor">
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
                    </EditorSection>
                </>
            ),
        },
        {
            key: 'apariencia',
            forceRender: true,
            label: 'Apariencia',
            children: (
                <>
                    {watchedNodeType === 'tema' && (
                        <EditorSection title="Iconos por estado" hint="Aparecen en el sider del visor." first>
                            <Form.Item name="iconOverrides" noStyle>
                                <TemaIconField />
                            </Form.Item>
                        </EditorSection>
                    )}
                    {watchedNodeType !== 'tema' && (
                        <EditorSection
                            title="Estatus de capa"
                            hint="Distintivo que acompaña al nombre de la capa en el visor."
                            first
                        >
                            <Form.Item
                                name="badge"
                                label={null}
                                valuePropName="value"
                                trigger="onChange"
                            >
                                <LayerBadgeSection />
                            </Form.Item>
                        </EditorSection>
                    )}
                    {watchedNodeType !== 'tema' && (
                        <EditorSection title="Aviso" hint="Mensaje que aparece al encender la capa.">
                            <Form.Item
                                name="notice"
                                label={null}
                                valuePropName="value"
                                trigger="onChange"
                            >
                                <LayerNoticeSection
                                    geoserverWorkspace={noticeWorkspace}
                                    geoserverLayer={selectedGsLayer || null}
                                    styles={(Array.isArray(selectedStyles) ? selectedStyles.join(',') : selectedStyles) || ''}
                                    cqlFilter={form.getFieldValue('cqlFilter') || ''}
                                    defaultZoom={form.getFieldValue('defaultZoom') || null}
                                />
                            </Form.Item>
                        </EditorSection>
                    )}
                    {watchedNodeType !== 'tema' && (
                        <EditorSection
                            title="Resaltado"
                            hint={watchedNodeType === 'leaf'
                                ? 'Cómo se marca una feature al hacer clic. Aplica a esta capa.'
                                : 'Cómo se marca una feature al hacer clic. Se propaga a las capas hijas que no tengan su propio resaltado.'}
                        >
                            <LayerHighlightField />
                        </EditorSection>
                    )}
                    <EditorSection title="Estado">
                        <Form.Item
                            label="Oculta en menú"
                            name="hiddenInMenu"
                            valuePropName="checked"
                            extra="Si está activa, la capa no aparece en el árbol del visor pero sigue siendo accesible vía URL/slug."
                        >
                            <Switch />
                        </Form.Item>
                        <Form.Item
                            label="Fuera de servicio"
                            name="disabled"
                            valuePropName="checked"
                            extra="En mantenimiento o sin datos. El visor la muestra atenuada y no deja encenderla."
                        >
                            <Switch />
                        </Form.Item>
                    </EditorSection>
                </>
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
                        label="Tipo de geometría"
                        name="geometryType"
                        extra="Se usa para el ícono que identifica la capa en el panel de capas activas del visor y en el árbol del plugin de QGIS. Lo llena solo el job `geometry-type` de dataengine leyendo el DescribeFeatureType de GeoServer; se ajusta a mano cuando la capa no se publica por WFS y no hay de dónde deducirlo."
                    >
                        <Select allowClear options={GEOMETRY_TYPE_OPTIONS} placeholder="Sin determinar" />
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
                        label="Servir por tiles (caché)"
                        name="tiled"
                        valuePropName="checked"
                        extra="Sirve la capa como TileWMS cacheable en GeoWebCache en vez de ImageWMS. Recomendado para capas grandes y estáticas: la navegación (pan/zoom) es mucho más fluida. Para capas que cambian seguido, dejar desactivado."
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item
                        label="Formato de imagen"
                        name="imageFormat"
                        extra="Formato que se le pide a GeoServer en cada GetMap. ⚠️ PNG 8 bits y JPEG salen SIN TRANSPARENCIA: cada tile es un rectángulo opaco que tapa el relieve y las capas de abajo. Verificado en los bytes del PNG — el de 8 bits sale como paleta indexada sin canal alfa. Úsalos solo en capas de fondo que ocupen todo el tile (un ráster base), nunca en capas que se superponen. Para el resto, dejar PNG: el ahorro de peso se consigue con el suavizado de bordes, que sí conserva la transparencia."
                    >
                        <Segmented
                            options={[
                                { label: 'PNG', value: 'image/png' },
                                { label: 'PNG 8 bits', value: 'image/png8' },
                                { label: 'JPEG', value: 'image/jpeg' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Suavizado de bordes (antialias)"
                        name="antialias"
                        extra="El suavizado crea píxeles intermedios que el PNG comprime mal: quitarlo baja un tile de 256×256 de curvas de nivel de 21.5 KB a 8.7 KB (−59 %) y conserva la transparencia, así que es la forma segura de aligerar una capa. A cambio, las líneas se ven dentadas — se nota en trazos finos como curvas de nivel o cauces. «Solo texto» conserva el suavizado en etiquetas y lo quita en geometrías. Cambiar este ajuste invalida los tiles ya cacheados en GeoWebCache."
                    >
                        <Segmented
                            options={[
                                { label: 'Completo', value: 'full' },
                                { label: 'Solo texto', value: 'text' },
                                { label: 'Ninguno', value: 'none' },
                            ]}
                        />
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
            label: 'Tarjetita',
            children: (() => {
                const crudoInfobox = watchedConfig || inheritedInfobox?.config || null;
                const previewInfobox = crudoInfobox && Object.keys(crudoInfobox).length > 0 ? crudoInfobox : null;
                return (
                    <SampleFeaturesProvider workspaceAlias={selectedWs} geoserverLayer={selectedGsLayer}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, minWidth: 0 }}>
                            <div style={{ flex: '1 1 340px', minWidth: 0 }}>
                                <InfoBoxEditorHeader
                                    mode={infoboxMode}
                                    onModeChange={setInfoboxMode}
                                    onApplyTemplate={(config) => form.setFieldsValue({ infoboxConfig: config })}
                                    availableFields={availableFields}
                                    fieldsLoading={fieldsLoading}
                                    hasFeatureType={!!selectedWs && !!selectedGsLayer}
                                    rawTree={rawTree}
                                    currentConfig={watchedConfig}
                                    currentLayerId={layerId}
                                />
                                <Form.Item name="infoboxConfig" label={null}>
                                    <InfoBoxEditor
                                        mode={infoboxMode}
                                        availableFields={availableFields}
                                        inherited={inheritedInfobox}
                                        nodeType={watchedNodeType}
                                    />
                                </Form.Item>
                            </div>
                            {previewInfobox && (
                                <div style={{ flex: '0 1 300px', minWidth: 0 }}>
                                    <div style={{ position: 'sticky', top: 0 }}>
                                        <InfoBoxPreviewPanel
                                            value={watchedConfig}
                                            inherited={inheritedInfobox}
                                            hasFeatureType={!!selectedWs && !!selectedGsLayer}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </SampleFeaturesProvider>
                );
            })(),
        },
        {
            key: 'metadatos',
            forceRender: true,
            label: 'Metadatos',
            children: !layer ? null : featureTypeContext ? (
                <LayerMetadataSection
                    layerKey={featureTypeContext.layerKey}
                    derivedFromDescendants={featureTypeContext.derived}
                    siblingsSharingCount={ownFeatureType ? countSiblingsSharingFeatureType(featureTypeContext.layerKey) : 0}
                />
            ) : (
                <Empty description={
                    sharedFeatureTypeFromDescendants?.multiple
                        ? `Este nodo agrupa capas con feature types distintos (${sharedFeatureTypeFromDescendants.multiple.join(', ')}). Los metadatos se editan en cada feature type por separado.`
                        : 'Este nodo no tiene feature type propio ni descendientes con uno común. No hay metadatos que editar aquí.'
                } />
            ),
        },
        {
            key: 'estadisticas',
            forceRender: true,
            label: 'Estadísticas',
            children: featureTypeContext ? (
                <LayerStatsSection
                    layerKey={featureTypeContext.layerKey}
                    workspace={featureTypeContext.workspace}
                    geoserverLayer={featureTypeContext.geoserverLayer}
                    availableFields={availableFields}
                />
            ) : (
                <Empty description="Este nodo no tiene feature type propio ni descendientes con uno común, así que no hay estadísticas que configurar." />
            ),
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

    const advancedSections = ADVANCED_TABS
        .map((key) => allTabs.find((tab) => tab.key === key))
        .filter(Boolean)
        .map((tab) => ({ key: tab.key, title: ADVANCED_TAB_TITLES[tab.key], children: tab.children }));

    const tabItems = allTabs.filter((tab) => PRIMARY_TABS.includes(tab.key));

    const nodeHelp = helpForNode(watchedNodeType, parentNodeType);
    const esOrganizador = isOrganizer(watchedNodeType);

    const parentPathLabel = (() => {
        const path = layerId ? findPath(treeData, layerId) : null;
        if (!path || path.length < 2) return 'la raíz del árbol';
        return path.slice(0, -1).map((n) => n.title).join(' › ');
    })();


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
        <Form form={form} layout="vertical" className="layer-editor-form" onValuesChange={scheduleAutosave}>
            {esOrganizador ? (
                <div className="layer-editor-stack">
                    {tabItems.map((tab) => (
                        <div key={tab.key}>{tab.children}</div>
                    ))}
                </div>
            ) : (
                <Tabs
                    className="layer-editor-tabs"
                    defaultActiveKey={initialTab}
                    items={tabItems}
                    tabPlacement="top"

                />
            )}
            <Drawer
                title="Avanzado"
                placement="right"
                width={isMobile ? '92%' : 600}
                extra={(
                    <Tooltip title={`Ahora cuelga de ${parentPathLabel}`}>
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
                open={advancedOpen}
                onClose={() => setAdvancedOpen(false)}
                forceRender
                styles={{ body: { padding: '20px 24px 28px' } }}
            >
                <AdvancedStack sections={advancedSections} />
                <div style={{ marginTop: 32, paddingTop: 18, borderTop: '1px solid #f0f0f0' }}>
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        disabled={deleteDisabled}
                        onClick={openDeleteModal}
                        block
                    >
                        {isAdmin ? 'Archivar capa' : 'Solicitar archivado'}
                    </Button>
                </div>
            </Drawer>
        </Form>
    );

    const showEditor = Boolean(layerId) && !selectedEventoKey;
    const selectedNode = layerId ? findNodeContext(treeData, layerId)?.node : null;
    const headerName = watchedLabel || layer?.label || selectedNode?.title || layerId;

    const editorHeader = (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: isMobile ? '10px 12px' : '14px 18px' }}>
            <Space size={8} wrap style={{ minWidth: 0 }}>
                <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>{headerName}</Title>
                <Tooltip title={nodeHelp ? `${nodeHelp.title}. ${nodeHelp.body}` : null}>
                    <Tag style={{ marginInlineEnd: 0, cursor: nodeHelp ? 'help' : 'default' }}>
                        {labelForNode(watchedNodeType, parentNodeType)}
                    </Tag>
                </Tooltip>
                {layer?.workspaceAlias && layer?.geoserverLayer && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {layer.workspaceAlias} : {layer.geoserverLayer}
                    </Text>
                )}
                {selectedNode?.hiddenInMenu && (
                    <Tooltip title="No aparece en el árbol del visor, pero sigue abriéndose por URL">
                        <Tag color="orange" style={{ marginInlineEnd: 0 }}>oculta</Tag>
                    </Tooltip>
                )}
                {selectedNode?.disabled && (
                    <Tooltip title="En mantenimiento o sin datos. El visor la muestra atenuada y no deja encenderla">
                        <Tag color="red" style={{ marginInlineEnd: 0 }}>fuera de servicio</Tag>
                    </Tooltip>
                )}
            </Space>
            {actionButtons}
        </div>
    );

    return (
        <div
            ref={shellRef}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: shellHeight ?? '70vh',
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
            <div style={{ padding: isMobile ? '8px 8px 0' : '24px 24px 0', flexShrink: 0 }}>
                <Space
                    align={isMobile ? 'start' : 'center'}
                    orientation={isMobile ? 'vertical' : 'horizontal'}
                    style={{ width: '100%', justifyContent: 'space-between' }}
                >
                    <Space align="center" size={10}>
                        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Capas MapaLab</Title>
                        {pendingCount > 0 && (
                            <Tooltip title="Ver y publicar los cambios que llevas sin publicar">
                                <Button size="small" type="primary" onClick={() => setReviewOpen(true)}>
                                    {pendingCount} sin publicar
                                </Button>
                            </Tooltip>
                        )}
                        {autosaveAt && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                guardado {autosaveAt.toLocaleTimeString()}
                            </Text>
                        )}
                    </Space>
                    <Space align="center" size={8}>
                        <Segmented
                            size={isMobile ? 'small' : 'middle'}
                            value="arbol"
                            onChange={(value) => {
                                if (value === 'tabla') navigate('/mapalab/layers/tabla');
                            }}
                            options={[
                                { label: 'Árbol', value: 'arbol', icon: <PartitionOutlined /> },
                                { label: 'Tabla', value: 'tabla', icon: <TableOutlined /> },
                            ]}
                        />
                        <Tooltip title={showEditor
                            ? 'Historial de cambios de esta capa'
                            : 'Historial de cambios de las capas'}
                        >
                            <Button
                                icon={<HistoryOutlined />}
                                onClick={() => setHistoryOpen(true)}
                                shape="circle"
                                aria-label="Historial de cambios"
                            />
                        </Tooltip>
                        <Tooltip title="Configuración global del resaltado de features">
                            <Button
                                icon={<SettingOutlined />}
                                onClick={() => setHighlightSettingsOpen(true)}
                                shape="circle"
                                aria-label="Configuración global del resaltado"
                            />
                        </Tooltip>
                    </Space>
                </Space>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', maxWidth: '70ch' }}>
                    {showEditor
                        ? 'Usa la ruta para moverte entre niveles: cada nombre despliega a sus hermanos.'
                        : 'Un tema o una categoría se abre; una capa se edita. Arrastra el asa de una fila para reordenarla entre sus hermanas.'}
                </Text>
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: isMobile ? '6px 4px 4px' : '10px 8px 8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <style>{`
                        .layers-tree-tabs { height: 100%; display: flex; flex-direction: column; min-height: 0; }
                        .layers-tree-tabs > .ant-tabs-content-holder { flex: 1; min-height: 0; overflow: hidden; }
                        .layers-tree-tabs > .ant-tabs-content-holder > .ant-tabs-content { height: 100%; }
                        .layers-tree-tabs .ant-tabs-tabpane { height: 100%; overflow: hidden; }
                        .layer-editor-form { flex: 1; display: flex; flex-direction: column; min-height: 0; }
                        .layer-editor-tabs { height: 100%; display: flex; flex-direction: column; min-height: 0; }
                        .layer-editor-tabs > .ant-tabs-nav { flex-shrink: 0; margin-bottom: 0; }
                        .layer-editor-tabs > .ant-tabs-content-holder { flex: 1; min-height: 0; overflow-y: auto; }
                        .layer-editor-tabs .ant-tabs-tabpane { padding: 16px 0 24px; }
                        .layer-editor-stack { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 0 24px; }
                    `}</style>
                    {showEditor ? (
                        <>
                            <div style={{ borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                                <LayerBreadcrumb
                                    treeData={catalogTreeData}
                                    selectedKey={layerId}
                                    onSelect={handleSelectFromTree}
                                    onBackToTree={() => navigate('/mapalab/layers')}
                                    isMobile={isMobile}
                                />
                            </div>
                            {editorHeader}
                            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: isMobile ? '0 12px' : '0 18px' }}>
                                {editorBody}
                            </div>
                        </>
                    ) : (
                        <Tabs
                            className="layers-tree-tabs"
                            activeKey={treeTab}
                            onChange={onTreeTabChange}
                            size="small"
                            tabBarStyle={{ padding: '0 12px', marginBottom: 0, flexShrink: 0 }}
                            tabBarExtraContent={{
                                right: (
                                    <Space size={4} style={{ paddingInlineEnd: 4 }}>
                                        {isAdmin && (
                                            <Tooltip title="Nuevo nodo">
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    icon={<PlusOutlined />}
                                                    onClick={() => setCreateOpen(true)}
                                                    aria-label="Nuevo nodo"
                                                />
                                            </Tooltip>
                                        )}
                                        <TreeSearchInput
                                            value={treeQuery}
                                            onChange={(v) => {
                                                setTreeQuery(v);
                                                if (v && showEditor) navigate('/mapalab/layers');
                                            }}
                                        />
                                    </Space>
                                ),
                            }}
                            items={[
                                {
                                    key: 'layers',
                                    label: `Capas (${catalogTreeData?.length || 0})`,
                                    children: (
                                        <LayersTreeListInline
                                            treeData={catalogTreeData}
                                            loading={treeLoading}
                                            error={treeError}
                                            selectedKey={null}
                                            onSelect={handleSelectFromTree}
                                            onReload={reload}
                                            onCreate={createLayer}
                                            isAdmin={isAdmin}
                                            onReorder={isAdmin ? handleReorder : null}
                                            q={treeQuery}
                                            createOpen={createOpen}
                                            onCreateClose={() => setCreateOpen(false)}
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
                    )}
                </div>
            </div>

            <LayerContentDrawer
                open={!!eventoLayerId}
                layerId={eventoLayerId}
                onClose={() => setEventoLayerId(null)}
                onSaved={reload}
            />

            <PublishReviewModal
                open={reviewOpen}
                onClose={() => setReviewOpen(false)}
                drafts={drafts}
                layerTitles={layerTitles}
                publishedValues={baseline && layerId ? { [layerId]: baseline } : {}}
                isAdmin={isAdmin}
                onPublish={handlePublish}
                onDiscard={handleDiscard}
                publishing={publishing}
            />

            <GridHistoryDrawer
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                resource="layer-config"
                columnsMeta={HISTORY_COLUMNS}
                rowKey={layerId || null}
                rowLabel={headerName}
            />

            <BulkTagsDrawer
                open={bulkTagsOpen}
                onClose={() => setBulkTagsOpen(false)}
                onDone={reload}
            />

            <LayerHighlightGlobalSettings
                open={highlightSettingsOpen}
                onClose={() => { setHighlightSettingsOpen(false); reload(); }}
                onBulkTagsClick={isAdmin ? () => setBulkTagsOpen(true) : null}
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
