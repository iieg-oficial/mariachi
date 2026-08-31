import { useMemo } from 'react';
import { Alert, Button, Space, Table, Tag, Typography, Tooltip } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';

const { Text } = Typography;

const collectLeafDescendants = (node, parentLabel = null, acc = []) => {
    if (!node) return acc;
    const children = node.children || [];
    for (const child of children) {
        const raw = child.raw || child;
        const wms = raw.wmsConfig || {};
        const ws = wms.workspace || raw.workspaceAlias || raw.workspace_alias;
        const gl = wms.geoserverLayer || raw.geoserverLayer || raw.geoserver_layer;
        const cql = wms.cqlFilter || raw.cqlFilter || raw.cql_filter;
        const nodeType = raw.nodeType || raw.node_type;
        if (nodeType === 'leaf' && ws && gl) {
            acc.push({
                key: child.key,
                id: child.key,
                label: child.title || raw.label,
                parentLabel,
                workspace: ws,
                geoserverLayer: gl,
                cqlFilter: cql || null,
                wmsGroup: wms.wmsGroup || raw.wmsGroup || raw.wms_group || null,
                disabled: !!raw.disabled,
            });
        }
        if (child.children?.length) {
            collectLeafDescendants(child, child.title || raw.label, acc);
        }
    }
    return acc;
};

const findNodeByKey = (nodes, targetKey) => {
    for (const n of nodes || []) {
        if (n.key === targetKey) return n;
        if (n.children?.length) {
            const found = findNodeByKey(n.children, targetKey);
            if (found) return found;
        }
    }
    return null;
};

export default function GroupServicesReference({ groupId, treeData }) {
    const navigate = useNavigate();

    const leafs = useMemo(() => {
        const node = findNodeByKey(treeData, groupId);
        if (!node) return [];
        return collectLeafDescendants(node);
    }, [groupId, treeData]);

    const featureTypes = useMemo(() => {
        const set = new Set();
        leafs.forEach((l) => set.add(`${l.workspace}:${l.geoserverLayer}`));
        return Array.from(set);
    }, [leafs]);

    const wmsGroups = useMemo(() => {
        const set = new Set();
        leafs.forEach((l) => l.wmsGroup && set.add(l.wmsGroup));
        return Array.from(set);
    }, [leafs]);

    const columns = [
        {
            title: 'Capa hija',
            dataIndex: 'label',
            key: 'label',
            render: (text, record) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{text}</Text>
                    {record.parentLabel && (
                        <Text type="secondary" style={{ fontSize: 11 }}>en: {record.parentLabel}</Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Feature type',
            key: 'featureType',
            render: (_, r) => <code>{r.workspace}:{r.geoserverLayer}</code>,
        },
        {
            title: 'CQL filter',
            dataIndex: 'cqlFilter',
            key: 'cqlFilter',
            render: (cql) => cql ? (
                <Text style={{ fontFamily: 'monospace', fontSize: 11 }} ellipsis={{ tooltip: cql }}>
                    {cql.length > 60 ? `${cql.slice(0, 60)}…` : cql}
                </Text>
            ) : <Text type="secondary">—</Text>,
        },
        {
            title: '',
            key: 'actions',
            width: 60,
            render: (_, r) => (
                <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/mapalab/layers/${encodeURIComponent(r.id)}/edit`)}
                />
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Tooltip title="Un grupo no emite request WMS propia: al activarlo en el visor se activan todas sus capas hijas, y la configuración WMS —workspace, capa de GeoServer, filtro CQL y estilo— vive en cada hija.">
                <Space wrap size={6} style={{ cursor: 'help' }}>
                    <Tag color="blue">{leafs.length} capa(s) hija(s)</Tag>
                    {featureTypes.length === 1 ? (
                        <Tag color="green">1 feature type compartido: <code>{featureTypes[0]}</code></Tag>
                    ) : (
                        <Tag color="orange">{featureTypes.length} feature types distintos</Tag>
                    )}
                    {wmsGroups.length === 1 && (
                        <Tag color="purple">wms_group: <code>{wmsGroups[0]}</code></Tag>
                    )}
                    {wmsGroups.length > 1 && (
                        <Tag color="orange">{wmsGroups.length} wms_groups distintos</Tag>
                    )}
                </Space>
            </Tooltip>

            <Table
                size="small"
                columns={columns}
                dataSource={leafs}
                rowKey="key"
                pagination={false}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: 'Este grupo no tiene capas hijas con feature type definido.' }}
            />
        </Space>
    );
}
