import { useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Empty,
    Input,
    Space,
    Spin,
    Tag,
    Tree,
    Typography,
    message,
} from 'antd';
import {
    PartitionOutlined,
    ReloadOutlined,
    SearchOutlined,
    FolderOutlined,
    FolderOpenOutlined,
    TagsOutlined,
    AppstoreOutlined,
    FileOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { useAuth } from '@shared/contexts/useAuth';
import BulkTagsDrawer from '@features/mapalab-layers/components/layersEditor/BulkTagsDrawer';
import { labelForNodeType } from '@features/mapalab-layers/constants/nodeTypes';
import useIsMobile from '@shared/hooks/useIsMobile';

const { Title, Text, Paragraph } = Typography;

const NODE_ICONS = {
    tema: <FolderOutlined style={{ color: '#722ed1' }} />,
    category: <FolderOpenOutlined style={{ color: '#1677ff' }} />,
    label: <TagsOutlined style={{ color: '#8c8c8c' }} />,
    group: <AppstoreOutlined style={{ color: '#faad14' }} />,
    leaf: <FileOutlined style={{ color: '#52c41a' }} />,
};


const renderTitle = (node) => {
    const { title, nodeType, workspaceAlias, geoserverLayer, disabled, hiddenInMenu } = node;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ opacity: disabled ? 0.5 : 1, wordBreak: 'break-word' }}>{title}</span>
            <Tag color="default">{labelForNodeType(nodeType)}</Tag>
            {workspaceAlias && <Tag color="blue">{workspaceAlias}</Tag>}
            {geoserverLayer && <Text type="secondary" style={{ fontSize: 11 }}>{geoserverLayer}</Text>}
            {hiddenInMenu && <Tag color="orange">oculto</Tag>}
            {disabled && <Tag color="red">disabled</Tag>}
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


export default function MapalabLayers() {
    const { isMobile } = useIsMobile();
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';
    const navigate = useNavigate();
    const {
        treeData, loading, error, reload, reorderLayers,
    } = useLayerTreeAdmin();
    const [selectedKey, setSelectedKey] = useState(null);
    const [q, setQ] = useState('');
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [bulkTagsOpen, setBulkTagsOpen] = useState(false);

    const visibleTree = filterTree(treeData, q);

    const handleSelect = (keys) => {
        setSelectedKey(keys[0] || null);
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
            await reorderLayers(parentId, ordered.map((s) => s.key));
            message.success('Orden actualizado');
            await reload();
        } catch (err) {
            message.error(err.response?.data?.detail || 'No se pudo reordenar');
        }
    };

    const handleEdit = () => {
        if (!selectedKey) return;
        navigate(`/mapalab/layers/${encodeURIComponent(selectedKey)}/edit`);
    };

    return (
        <Card
            title={
                <Space>
                    <PartitionOutlined />
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>Editor de Capas MapaLab</Title>
                </Space>
            }
            extra={
                <Space wrap size={[8, 8]} style={{ width: isMobile ? '100%' : 'auto' }}>
                    <Input
                        placeholder="Buscar capa"
                        prefix={<SearchOutlined />}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        allowClear
                        style={{ width: isMobile ? '100%' : 220 }}
                    />
                    <Button
                        type="primary"
                        disabled={!selectedKey}
                        onClick={handleEdit}
                        block={isMobile}
                    >
                        Editar seleccionada
                    </Button>
                    {isAdmin && (
                        <Button icon={<TagsOutlined />} onClick={() => setBulkTagsOpen(true)} block={isMobile}>
                            Bulk tags
                        </Button>
                    )}
                    <Button icon={<ReloadOutlined />} onClick={reload} block={isMobile}>Recargar</Button>
                </Space>
            }
        >
            <Paragraph type="secondary">
                Árbol jerárquico del visor MapaLab. Los nodos <Tag>tema</Tag> / <Tag color="blue">category</Tag> / <Tag color="default">group</Tag> organizan las capas. Los nodos <Tag color="green">leaf</Tag> son las capas WMS reales.
            </Paragraph>
            {error && <Alert type="error" title={error} style={{ marginBottom: 16 }} />}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 12, color: 'rgba(0,0,0,0.45)' }}>Cargando árbol de capas...</div>
                </div>
            ) : visibleTree.length === 0 ? (
                <Empty description="Sin resultados" />
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <Tree
                        treeData={visibleTree}
                        showIcon
                        icon={(props) => NODE_ICONS[props.nodeType] || NODE_ICONS.leaf}
                        titleRender={renderTitle}
                        selectedKeys={selectedKey ? [selectedKey] : []}
                        onSelect={handleSelect}
                        expandedKeys={expandedKeys}
                        onExpand={setExpandedKeys}
                        autoExpandParent
                        draggable={isAdmin && !q}
                        onDrop={handleDrop}
                        blockNode
                    />
                </div>
            )}

            <BulkTagsDrawer
                open={bulkTagsOpen}
                onClose={() => setBulkTagsOpen(false)}
                onDone={reload}
            />
        </Card>
    );
}
