import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Input, Space, Spin, Tag, Tree, Typography, message } from 'antd';
import {
    AppstoreOutlined,
    FileOutlined,
    FolderOpenOutlined,
    FolderOutlined,
    ReloadOutlined,
    SearchOutlined,
    TagsOutlined,
} from '@ant-design/icons';
import { labelForNodeType } from '@features/mapalab-layers/constants/nodeTypes';

const { Text, Title } = Typography;

const NODE_ICONS = {
    tema: <FolderOutlined style={{ color: '#722ed1' }} />,
    category: <FolderOpenOutlined style={{ color: '#1677ff' }} />,
    label: <TagsOutlined style={{ color: '#8c8c8c' }} />,
    group: <AppstoreOutlined style={{ color: '#faad14' }} />,
    leaf: <FileOutlined style={{ color: '#52c41a' }} />,
};

const NODE_TAG_COLORS = {
    tema: 'purple',
    category: 'blue',
    label: 'default',
    group: 'gold',
    leaf: 'green',
};

const renderTitle = (node) => {
    const { title, nodeType, workspaceAlias, geoserverLayer, disabled, hiddenInMenu } = node;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ opacity: disabled ? 0.5 : 1, wordBreak: 'break-word' }}>{title}</span>
            <Tag color={NODE_TAG_COLORS[nodeType] || 'default'} style={{ fontSize: 10, marginRight: 0 }}>
                {labelForNodeType(nodeType)}
            </Tag>
            {workspaceAlias && (
                <Tag color="blue" style={{ fontSize: 10, marginRight: 0 }}>{workspaceAlias}</Tag>
            )}
            {geoserverLayer && (
                <Text type="secondary" style={{ fontSize: 11 }}>{geoserverLayer}</Text>
            )}
            {hiddenInMenu && <Tag color="orange" style={{ fontSize: 10, marginRight: 0 }}>oculto</Tag>}
            {disabled && <Tag color="red" style={{ fontSize: 10, marginRight: 0 }}>disabled</Tag>}
        </span>
    );
};

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
    isAdmin = false,
    showHeader = true,
    onBulkTagsClick,
}) {
    const [q, setQ] = useState('');
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [userTouchedExpansion, setUserTouchedExpansion] = useState(false);

    const visibleTree = useMemo(() => filterTree(treeData, q), [treeData, q]);

    useEffect(() => {
        if (userTouchedExpansion) return;
        if (selectedKey) return;
        if (!treeData?.length) return;
        const allKeys = [];
        const collect = (nodes) => {
            for (const n of nodes) {
                if (n.children?.length) {
                    allKeys.push(n.key);
                    collect(n.children);
                }
            }
        };
        collect(treeData);
        setExpandedKeys(allKeys);
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

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
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
                {isAdmin && onBulkTagsClick && (
                    <Button size="small" icon={<TagsOutlined />} onClick={onBulkTagsClick}>
                        Bulk tags
                    </Button>
                )}
                {onReload && (
                    <Button size="small" icon={<ReloadOutlined />} onClick={onReload}>
                        Recargar
                    </Button>
                )}
            </Space>
            {error && <Alert type="error" title={error} />}
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <Spin />
                    </div>
                ) : visibleTree.length === 0 ? (
                    <Empty description="Sin resultados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <Tree
                        treeData={visibleTree}
                        showIcon
                        icon={(props) => NODE_ICONS[props.nodeType] || NODE_ICONS.leaf}
                        titleRender={renderTitle}
                        selectedKeys={selectedKey ? [selectedKey] : []}
                        onSelect={(keys) => onSelect?.(keys[0] || null)}
                        expandedKeys={expandedKeys}
                        onExpand={(keys) => { setExpandedKeys(keys); setUserTouchedExpansion(true); }}
                        autoExpandParent
                        expandAction="click"
                        draggable={isAdmin && !q}
                        onDrop={handleDrop}
                        blockNode
                    />
                )}
            </div>
        </div>
    );
}
