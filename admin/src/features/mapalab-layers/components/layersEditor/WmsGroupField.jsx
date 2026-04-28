import { useMemo } from 'react';
import { Select, Space, Tag, Tooltip, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const flattenTree = (nodes, parentId = null, parentLabel = null, acc = []) => {
    if (!nodes) return acc;
    for (const n of nodes) {
        const raw = n.raw || n;
        acc.push({
            id: n.key || raw.id,
            label: raw.label || n.title,
            wmsGroup: raw.wmsGroup ?? raw.wms_group ?? null,
            workspaceAlias: raw.workspaceAlias ?? raw.workspace_alias ?? null,
            geoserverLayer: raw.geoserverLayer ?? raw.geoserver_layer ?? null,
            timeEnabled: raw.timeEnabled ?? raw.time_enabled ?? false,
            nodeType: raw.nodeType ?? raw.node_type ?? null,
            parentId,
            parentLabel,
        });
        if (n.children?.length) {
            flattenTree(n.children, n.key || raw.id, raw.label || n.title, acc);
        }
    }
    return acc;
};

export default function WmsGroupField({
    value,
    onChange,
    layerId,
    treeData,
    workspaceAlias,
    timeEnabled,
}) {
    const flat = useMemo(() => flattenTree(treeData), [treeData]);
    const currentLayer = flat.find((l) => l.id === layerId);
    const currentParentId = currentLayer?.parentId ?? null;

    const allGroups = useMemo(() => {
        const map = new Map();
        for (const l of flat) {
            if (!l.wmsGroup) continue;
            if (l.id === layerId) continue;
            if (!map.has(l.wmsGroup)) map.set(l.wmsGroup, []);
            map.get(l.wmsGroup).push(l);
        }
        return map;
    }, [flat, layerId]);

    const siblingGroups = useMemo(() => {
        const set = new Set();
        for (const l of flat) {
            if (l.id === layerId) continue;
            if (l.parentId !== currentParentId) continue;
            if (l.wmsGroup) set.add(l.wmsGroup);
        }
        return set;
    }, [flat, currentParentId, layerId]);

    const options = useMemo(() => {
        const buildOpt = (g, members) => ({
            value: g,
            label: (
                <Space size={6}>
                    <span style={{ fontFamily: 'monospace' }}>{g}</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {members.length} capa{members.length === 1 ? '' : 's'}
                    </Text>
                </Space>
            ),
        });
        const sibling = [];
        const others = [];
        for (const [g, members] of allGroups.entries()) {
            const opt = buildOpt(g, members);
            if (siblingGroups.has(g)) sibling.push(opt);
            else others.push(opt);
        }
        const groups = [];
        if (sibling.length) groups.push({ label: 'Grupos en hermanos directos', options: sibling });
        if (others.length) groups.push({ label: 'Otros grupos en el árbol', options: others });
        if (value && !allGroups.has(value)) {
            groups.unshift({
                label: 'Valor actual (sin otras capas asignadas)',
                options: [buildOpt(value, [])],
            });
        }
        return groups;
    }, [allGroups, siblingGroups, value]);

    const members = value ? (allGroups.get(value) || []) : [];

    const warnings = [];
    if (value && members.length > 0) {
        const wsMismatch = members.filter((m) => m.workspaceAlias !== workspaceAlias);
        if (wsMismatch.length) {
            warnings.push(`Workspace distinto: ${wsMismatch.map((m) => m.workspaceAlias || '—').join(', ')} (esta capa: ${workspaceAlias || '—'})`);
        }
        const branchMismatch = members.filter((m) => m.parentId !== currentParentId);
        if (branchMismatch.length) {
            warnings.push(`${branchMismatch.length} miembro(s) en otra rama del árbol`);
        }
        const timeMismatch = members.filter((m) => Boolean(m.timeEnabled) !== Boolean(timeEnabled));
        if (timeMismatch.length) {
            warnings.push('Configuración temporal (timeEnabled) distinta entre miembros');
        }
    }

    return (
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Select
                value={value || undefined}
                onChange={(v) => onChange?.(v ?? '')}
                options={options}
                placeholder={
                    allGroups.size === 0
                        ? 'No hay grupos definidos en otras capas'
                        : 'Sin grupo (cada capa es una request independiente)'
                }
                allowClear
                showSearch
                style={{ width: '100%' }}
                filterOption={(input, option) => {
                    if (option.options) return true;
                    return String(option.value).toLowerCase().includes(input.toLowerCase());
                }}
                notFoundContent="Sin grupos disponibles"
            />

            {value && members.length > 0 && (
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Otras capas en este grupo ({members.length}):
                    </Text>
                    <div style={{ marginTop: 4 }}>
                        {members.map((m) => (
                            <Tooltip
                                key={m.id}
                                title={
                                    <Space orientation="vertical" size={0}>
                                        <span>workspace: {m.workspaceAlias || '—'}</span>
                                        <span>capa GS: {m.geoserverLayer || '—'}</span>
                                        <span>rama: {m.parentLabel || '—'}</span>
                                    </Space>
                                }
                            >
                                <Tag
                                    color={m.parentId === currentParentId ? 'blue' : 'default'}
                                    style={{ marginBottom: 4, cursor: 'help' }}
                                >
                                    {m.label}
                                </Tag>
                            </Tooltip>
                        ))}
                    </div>
                </div>
            )}

            {warnings.map((w, i) => (
                <Tag
                    key={i}
                    color="orange"
                    icon={<ExclamationCircleOutlined />}
                    style={{ whiteSpace: 'normal', height: 'auto', padding: '2px 8px' }}
                >
                    {w}
                </Tag>
            ))}
        </Space>
    );
}
