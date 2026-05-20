import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Empty, Input, Space, Spin, Tooltip, Tree, Typography } from 'antd';
import {
    EyeInvisibleOutlined,
    HolderOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    StopOutlined,
    TagsOutlined,
} from '@ant-design/icons';
import LayerCreateModal from '@features/mapalab-layers/components/LayerCreateModal';
import { message } from '@shared/services/message';

const { Title } = Typography;

const isEventoNode = (nodeType) => typeof nodeType === 'string' && nodeType.startsWith('evento');

const EXPANDED_KEYS_STORAGE = 'mapalab_layers_expanded';

function loadExpandedKeys() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(EXPANDED_KEYS_STORAGE);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
}

function saveExpandedKeys(keys) {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(EXPANDED_KEYS_STORAGE, JSON.stringify(keys)); } catch { /* ignore */ }
}

function StatusIcons({ disabled, hiddenInMenu }) {
    if (!disabled && !hiddenInMenu) return null;
    return (
        <span style={{ display: 'inline-flex', gap: 4, marginLeft: 4 }}>
            {hiddenInMenu && (
                <Tooltip title="Oculto del menú del visor">
                    <EyeInvisibleOutlined style={{ color: '#fa8c16', fontSize: 12 }} />
                </Tooltip>
            )}
            {disabled && (
                <Tooltip title="Deshabilitado">
                    <StopOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                </Tooltip>
            )}
        </span>
    );
}

function CompactNodeTitle({ node, onEdit }) {
    const { title, disabled } = node;

    const handleClick = (e) => {
        e.stopPropagation();
        onEdit?.();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onEdit?.();
        }
    };

    return (
        <span
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                minWidth: 0,
                gap: 4,
                cursor: 'pointer',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <span style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal',
                    lineHeight: '18px',
                }}>
                    {title}
                </span>
            </span>
            <StatusIcons disabled={disabled} hiddenInMenu={node.hiddenInMenu} />
        </span>
    );
}


const filterTree = (nodes, q) => {
    if (!q) return nodes;
    const lowered = q.toLowerCase();
    const walk = (list) =>
        list
            .map((n) => {
                const matchSelf = n.title.toLowerCase().includes(lowered)
                    || (n.workspaceAlias || '').toLowerCase().includes(lowered)
                    || (n.geoserverLayer || '').toLowerCase().includes(lowered)
                    || n.key.toLowerCase().includes(lowered);
                const children = n.children ? walk(n.children) : [];
                if (matchSelf || children.length > 0) {
                    return { ...n, children: children.length > 0 ? children : n.children };
                }
                return null;
            })
            .filter(Boolean);
    return walk(nodes);
};

const findParentAndSiblings = (nodes, targetKey, parent = null) => {
    for (const n of nodes) {
        if (n.key === targetKey) return { parent, siblings: nodes };
        if (n.children) {
            const found = findParentAndSiblings(n.children, targetKey, n);
            if (found) return found;
        }
    }
    return null;
};

export default function LayersTreeSider({
    treeData,
    loading,
    error,
    selectedKey,
    onSelect,
    onReload,
    onReorder,
    onCreate,
    isAdmin = false,
    showHeader = true,
    onBulkTagsClick,
}) {
    const [createOpen, setCreateOpen] = useState(false);
    const [q, setQ] = useState('');
    const [expandedKeys, setExpandedKeys] = useState(() => loadExpandedKeys() || []);
    const [userTouchedExpansion, setUserTouchedExpansion] = useState(() => loadExpandedKeys() !== null);

    const visibleTree = useMemo(() => filterTree(treeData, q), [treeData, q]);
    const canReorder = isAdmin && !q;

    useEffect(() => {
        if (userTouchedExpansion) return;
        if (selectedKey) return;
        if (!treeData?.length) return;
        const topKeys = treeData
            .filter((n) => n.children?.length)
            .map((n) => n.key);
        setExpandedKeys(topKeys);
    }, [selectedKey, treeData, userTouchedExpansion]);

    const handleDrop = async (info) => {
        if (!isAdmin) {
            message.warning('Solo admin puede reordenar');
            return;
        }
        if (!info.dropToGap) {
            message.warning('Soltar entre hermanos (no dentro de un nodo)');
            return;
        }
        const dragKey = info.dragNode.key;
        const dropKey = info.node.key;

        const dragCtx = findParentAndSiblings(treeData, dragKey);
        const dropCtx = findParentAndSiblings(treeData, dropKey);
        if (!dragCtx || !dropCtx) return;
        if (dragCtx.parent?.key !== dropCtx.parent?.key) {
            message.warning('Por ahora solo se puede reordenar dentro del mismo padre');
            return;
        }

        const siblings = dropCtx.siblings;
        const fromIdx = siblings.findIndex((s) => s.key === dragKey);
        const dropIdx = siblings.findIndex((s) => s.key === dropKey);
        const toIdx = info.dropPosition < dropIdx ? dropIdx : dropIdx + 1;
        const ordered = [...siblings];
        const [moved] = ordered.splice(fromIdx, 1);
        ordered.splice(toIdx > fromIdx ? toIdx - 1 : toIdx, 0, moved);

        const parentId = dragCtx.parent?.key || null;
        try {
            await onReorder(parentId, ordered.map((s) => s.key));
            message.success('Orden actualizado');
            if (onReload) await onReload();
        } catch (err) {
            message.error(err.response?.data?.detail || 'No se pudo reordenar');
        }
    };

    const renderTitle = useCallback((node) => (
        <CompactNodeTitle node={node} onEdit={() => onSelect?.(node.key)} />
    ), [onSelect]);

    const containerRef = useRef(null);
    const [containerHeight, setContainerHeight] = useState(400);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const h = entry.contentRect.height;
                if (h > 0) setContainerHeight(h);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
            {showHeader && (
                <Title level={5} style={{ margin: 0 }}>Árbol de capas</Title>
            )}
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
                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                        Nuevo
                    </Button>
                )}
                {isAdmin && onBulkTagsClick && (
                    <Button size="small" icon={<TagsOutlined />} onClick={onBulkTagsClick}>
                        Etiquetas en lote
                    </Button>
                )}
                {onReload && (
                    <Button size="small" icon={<ReloadOutlined />} onClick={onReload}>
                        Recargar
                    </Button>
                )}
            </Space>
            {error && <Alert closable type="error" title={error} />}
            <div ref={containerRef} className="layers-tree-compact" style={{ flex: 1, minHeight: 0, position: 'relative', overflowX: 'hidden' }}>
                <style>{`
                    .layers-tree-compact .ant-tree,
                    .layers-tree-compact .ant-tree-list,
                    .layers-tree-compact .ant-tree-list-holder,
                    .layers-tree-compact .ant-tree-list-holder-inner {
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .layers-tree-compact .ant-tree-treenode {
                        width: 100% !important;
                        box-sizing: border-box;
                        padding-right: 4px;
                    }
                    .layers-tree-compact .ant-tree-node-content-wrapper {
                        flex: 1 1 auto;
                        min-width: 0;
                        overflow: hidden;
                    }
                    .layers-tree-compact .ant-tree-title {
                        display: block;
                        min-width: 0;
                        overflow: hidden;
                        word-break: break-word;
                        white-space: normal;
                    }
                    .layers-tree-compact .ant-tree-node-content-wrapper {
                        white-space: normal !important;
                        height: auto !important;
                        min-height: 0;
                        line-height: 1.4;
                    }
                `}</style>
                <style>{`
                    .layers-tree-compact .ant-tree-switcher_open,
                    .layers-tree-compact .ant-tree-switcher_close {
                        width: 0 !important;
                        min-width: 0 !important;
                        overflow: hidden;
                        transition: width 0.15s, min-width 0.15s;
                    }
                    .layers-tree-compact .ant-tree-treenode:hover .ant-tree-switcher_open,
                    .layers-tree-compact .ant-tree-treenode:hover .ant-tree-switcher_close {
                        width: 24px !important;
                        min-width: 24px !important;
                    }
                `}</style>
                <style>{`
                    .layers-tree-compact .ant-tree-draggable-icon {
                        width: 16px !important;
                        min-width: 16px !important;
                        opacity: 0.45;
                        cursor: grab;
                    }
                    .layers-tree-compact .ant-tree-treenode:hover .ant-tree-draggable-icon {
                        opacity: 1;
                    }
                `}</style>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <Spin />
                    </div>
                ) : visibleTree.length === 0 ? (
                    <Empty description="Sin resultados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <Tree
                        treeData={visibleTree}
                        titleRender={renderTitle}
                        selectedKeys={selectedKey ? [selectedKey] : []}
                        onSelect={(keys) => onSelect?.(keys[0] || null)}
                        expandedKeys={expandedKeys}
                        onExpand={(keys) => { setExpandedKeys(keys); setUserTouchedExpansion(true); saveExpandedKeys(keys); }}
                        autoExpandParent={Boolean(q)}
                        expandAction={false}
                        draggable={canReorder ? { icon: <HolderOutlined />, nodeDraggable: (node) => !isEventoNode(node?.nodeType) } : false}
                        onDrop={handleDrop}
                        blockNode
                        virtual
                        height={containerHeight}
                        itemHeight={44}
                    />
                )}
            </div>
            {isAdmin && onCreate && (
                <LayerCreateModal
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    onSubmit={async (payload) => {
                        await onCreate(payload);
                        if (onReload) await onReload();
                    }}
                    treeData={treeData}
                    defaultParentId={selectedKey || null}
                />
            )}
        </div>
    );
}
