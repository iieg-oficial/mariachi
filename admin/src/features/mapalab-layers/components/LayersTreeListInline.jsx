import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Grid, Input, Space, Spin } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LayerCreateModal from '@features/mapalab-layers/components/LayerCreateModal';
import { matchesQuery } from '@features/mapalab-layers/utils/treeSearch';
import LayersTreeBranch, { SortableTreeBranch } from './LayersTreeBranch';
import './layersTree.css';

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
    const walk = (list) =>
        (list || [])
            .map((n) => {
                const children = n.children ? walk(n.children) : [];
                if (!matchesQuery(n, q) && children.length === 0) return null;
                return { ...n, children: children.length > 0 ? children : n.children };
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

const findAncestors = (nodes, targetKey, ancestors = []) => {
    for (const n of nodes || []) {
        if (n.key === targetKey) return ancestors;
        if (n.children?.length) {
            const found = findAncestors(n.children, targetKey, [...ancestors, n.key]);
            if (found) return found;
        }
    }
    return null;
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
}) {
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [q, setQ] = useState('');
    const [expanded, setExpanded] = useState(() => loadExpanded());
    const [createOpen, setCreateOpen] = useState(false);

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
        onReorder?.(null, arrayMove(visibleTree, oldIndex, newIndex).map((n) => n.key));
    }, [visibleTree, onReorder]);

    useEffect(() => {
        if (!selectedKey) return;
        setExpanded((prev) => {
            const ancestors = findAncestors(treeData, selectedKey);
            if (!ancestors?.length) return prev;
            const next = new Set(prev);
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

    const effectiveExpanded = useMemo(
        () => (q ? collectKeys(visibleTree) : expanded),
        [q, visibleTree, expanded],
    );

    const branchProps = {
        depth: 0,
        expanded: effectiveExpanded,
        selectedKey,
        isMobile,
        toggleExpanded,
        onSelect,
        onEdit: onSelect,
        onReorder: q ? null : onReorder,
    };

    const renderBody = () => {
        if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>;
        if (visibleTree.length === 0) {
            return <Empty description={q ? 'Ninguna capa coincide' : 'Sin capas'} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
        }
        if (!onReorder || q) {
            return visibleTree.map((node) => (
                <LayersTreeBranch key={node.key} node={node} {...branchProps} />
            ));
        }
        return (
            <DndContext sensors={rootSensors} collisionDetection={closestCenter} onDragEnd={handleRootDragEnd}>
                <SortableContext items={visibleTree.map((n) => n.key)} strategy={verticalListSortingStrategy}>
                    {visibleTree.map((node) => (
                        <SortableTreeBranch key={node.key} node={node} {...branchProps} />
                    ))}
                </SortableContext>
            </DndContext>
        );
    };

    return (
        <div style={{ padding: isMobile ? 6 : 12, display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12, height: '100%', minHeight: 0 }}>
            <Input
                placeholder="Buscar por nombre, workspace o capa de GeoServer"
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
                {onReload && (
                    <Button size="small" icon={<ReloadOutlined />} onClick={onReload}>Recargar</Button>
                )}
            </Space>
            {error && <Alert closable type="error" message={error} />}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fff' }}>
                {renderBody()}
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
