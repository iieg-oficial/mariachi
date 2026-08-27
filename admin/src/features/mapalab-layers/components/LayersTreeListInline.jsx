import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Grid, Input, Space, Spin, Tooltip } from 'antd';
import { HolderOutlined, InfoCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LayerCreateModal from '@features/mapalab-layers/components/LayerCreateModal';
import LayersTreeBranch, { SortableTreeBranch } from './LayersTreeBranch';

const { useBreakpoint } = Grid;

const EXPANDED_KEYS_STORAGE = 'mapalab_layers_inline_expanded';

const loadExpanded = () => {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = window.localStorage.getItem(EXPANDED_KEYS_STORAGE);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
};

const saveExpanded = (set) => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(EXPANDED_KEYS_STORAGE, JSON.stringify([...set])); }
    catch { /* ignore */ }
};

const filterTree = (nodes, q) => {
    if (!q) return nodes;
    const lowered = q.toLowerCase();
    const walk = (list) =>
        (list || [])
            .map((n) => {
                const matchSelf = (n.title || '').toLowerCase().includes(lowered)
                    || (n.workspaceAlias || '').toLowerCase().includes(lowered)
                    || (n.geoserverLayer || '').toLowerCase().includes(lowered)
                    || (n.key || '').toLowerCase().includes(lowered);
                const children = n.children ? walk(n.children) : [];
                if (matchSelf || children.length > 0) {
                    return { ...n, children: children.length > 0 ? children : (matchSelf ? n.children : []) };
                }
                return null;
            })
            .filter(Boolean);
    return walk(nodes);
};

const collectKeys = (nodes, acc = new Set()) => {
    for (const n of nodes || []) {
        acc.add(n.key);
        if (n.children?.length) collectKeys(n.children, acc);
    }
    return acc;
};

export default function LayersTreeListInline({
    treeData,
    loading,
    error,
    selectedKey,
    onSelect,
    onReload,
    onCreate,
    isAdmin = false,
    onBulkTagsClick,
    onReorder,
    editorContent,
    actionButtons,
}) {
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [q, setQ] = useState('');
    const [expanded, setExpanded] = useState(() => loadExpanded());
    const [createOpen, setCreateOpen] = useState(false);
    const [editorOpen, setEditorOpen] = useState(true);
    const [reorderDragEnabled, setReorderDragEnabled] = useState(false);

    useEffect(() => { setEditorOpen(true); }, [selectedKey]);

    const toggleEditor = useCallback(() => setEditorOpen((v) => !v), []);

    const visibleTree = useMemo(() => filterTree(treeData, q), [treeData, q]);

    const rootSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleRootDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = visibleTree.findIndex((n) => n.key === active.id);
        const newIndex = visibleTree.findIndex((n) => n.key === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const reordered = arrayMove(visibleTree, oldIndex, newIndex);
        onReorder?.(null, reordered.map((n) => n.key));
    }, [visibleTree, onReorder]);

    useEffect(() => {
        if (q) {
            const allKeys = collectKeys(visibleTree);
            setExpanded((prev) => new Set([...prev, ...allKeys]));
        }
    }, [q, visibleTree]);

    useEffect(() => {
        if (!selectedKey) return;
        setExpanded((prev) => {
            const next = new Set(prev);
            const ancestors = findAncestors(treeData, selectedKey);
            ancestors.forEach((k) => next.add(k));
            return next;
        });
    }, [selectedKey, treeData]);

    const toggleExpanded = useCallback((key) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            saveExpanded(next);
            return next;
        });
    }, []);

    return (
        <div style={{ padding: isMobile ? 6 : 12, display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12, height: '100%', minHeight: 0 }}>
            <Input
                placeholder="Buscar capa"
                prefix={<SearchOutlined />}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                allowClear
                size="small"
            />
            <Space size={6} wrap>
                {isAdmin && onCreate && (
                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Nuevo</Button>
                )}
                {isAdmin && onBulkTagsClick && (
                    <Button size="small" icon={<TagsOutlined />} onClick={onBulkTagsClick}>Etiquetas en lote</Button>
                )}
                {isAdmin && onReorder && (
                    <Button
                        size="small"
                        icon={<HolderOutlined />}
                        type={reorderDragEnabled ? 'primary' : 'default'}
                        onClick={() => setReorderDragEnabled((v) => !v)}
                    >
                        Reordenar
                    </Button>
                )}
                {onReload && (
                    <Button size="small" icon={<ReloadOutlined />} onClick={onReload}>Recargar</Button>
                )}
                <Tooltip title="Click sobre un nodo lo selecciona y abre el editor inline debajo. Click sobre el triangulo lo expande sin abrir el editor.">
                    <Button size="small" icon={<InfoCircleOutlined />} aria-label="Ayuda" />
                </Tooltip>
            </Space>
            {error && <Alert closable type="error" title={error} />}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'scroll', overflowX: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fff' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                ) : visibleTree.length === 0 ? (
                    <Empty description="Sin resultados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : reorderDragEnabled && onReorder ? (
                    <DndContext sensors={rootSensors} collisionDetection={closestCenter} onDragEnd={handleRootDragEnd}>
                        <SortableContext items={visibleTree.map((n) => n.key)} strategy={verticalListSortingStrategy}>
                            {visibleTree.map((node) => (
                                <SortableTreeBranch
                                    key={node.key}
                                    node={node}
                                    depth={0}
                                    expanded={expanded}
                                    selectedKey={selectedKey}
                                    editorOpen={editorOpen}
                                    editorContent={editorContent}
                                    actionButtons={actionButtons}
                                    isMobile={isMobile}
                                    toggleExpanded={toggleExpanded}
                                    onSelect={onSelect}
                                    onToggleEditor={toggleEditor}
                                    enableDrag={reorderDragEnabled}
                                    onReorder={onReorder}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                ) : (
                    visibleTree.map((node) => (
                        <LayersTreeBranch
                            key={node.key}
                            node={node}
                            depth={0}
                            expanded={expanded}
                            selectedKey={selectedKey}
                            editorOpen={editorOpen}
                            editorContent={editorContent}
                            actionButtons={actionButtons}
                            isMobile={isMobile}
                            toggleExpanded={toggleExpanded}
                            onSelect={onSelect}
                            onToggleEditor={toggleEditor}
                        />
                    ))
                )}
            </div>
            {isAdmin && onCreate && (
                <LayerCreateModal
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    onSubmit={async (payload) => { await onCreate(payload); if (onReload) await onReload(); }}
                    treeData={treeData}
                    defaultParentId={selectedKey || null}
                />
            )}
        </div>
    );
}

function findAncestors(nodes, targetKey, ancestors = []) {
    for (const n of nodes || []) {
        if (n.key === targetKey) return ancestors;
        if (n.children?.length) {
            const found = findAncestors(n.children, targetKey, [...ancestors, n.key]);
            if (found) return found;
        }
    }
    return null;
}
