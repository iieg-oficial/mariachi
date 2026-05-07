import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Modal, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '@shared/services/api';

const { Text } = Typography;

const ELLIPSIS = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 };

export default function AddCapaModal({
    open,
    onClose,
    onAdd,
    isAdmin,
    labelByKey,
    taken,
    reloadKey,
}) {
    const [search, setSearch] = useState('');
    const [onlyUnregistered, setOnlyUnregistered] = useState(false);
    const [gsWorkspaces, setGsWorkspaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        setLoading(true);
        setError(null);
        const params = isAdmin ? { include_unregistered: true } : {};
        api.get('/geoserver/workspaces', { params })
            .then((res) => { if (!cancelled) setGsWorkspaces(res.data || []); })
            .catch((err) => {
                if (cancelled) return;
                setGsWorkspaces([]);
                setError(err?.response?.data?.detail || 'No se pudo conectar a GeoServer. Reintenta o avisa al admin.');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, isAdmin, reloadKey]);

    const available = useMemo(() => {
        const out = [];
        for (const ws of gsWorkspaces || []) {
            const wsAlias = ws.alias || ws.geoserverWorkspace;
            for (const layerName of ws.layers || []) {
                const key = `${wsAlias}/${layerName}`;
                if (taken.has(key)) continue;
                const reg = labelByKey.get(key);
                out.push({
                    id: key,
                    workspace: wsAlias,
                    geoserverWorkspace: ws.geoserverWorkspace,
                    workspaceRegistered: ws.registered !== false,
                    layer: layerName,
                    label: reg?.label || layerName,
                    registered: Boolean(reg),
                });
            }
        }
        let filtered = onlyUnregistered ? out.filter((l) => !l.registered) : out;
        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter((l) =>
                l.label.toLowerCase().includes(q)
                || l.layer.toLowerCase().includes(q)
                || l.workspace.toLowerCase().includes(q),
            );
        }
        return filtered;
    }, [gsWorkspaces, taken, labelByKey, search, onlyUnregistered]);

    const columns = [
        {
            title: 'Capa',
            key: 'label',
            render: (_, r) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <Tooltip title={r.label} mouseEnterDelay={0.5}>
                            <span style={ELLIPSIS}>{r.label}</span>
                        </Tooltip>
                        {r.registered ? (
                            <Tag color="green" style={{ fontSize: 10, marginRight: 0, flexShrink: 0 }}>en árbol</Tag>
                        ) : (
                            <Tag color="gold" style={{ fontSize: 10, marginRight: 0, flexShrink: 0 }}>solo GeoServer</Tag>
                        )}
                    </div>
                    <Tooltip title={`${r.workspace}:${r.layer}`} mouseEnterDelay={0.5}>
                        <Text type="secondary" style={{ fontSize: 11, ...ELLIPSIS, display: 'block' }}>
                            {r.workspace}:{r.layer}
                        </Text>
                    </Tooltip>
                </div>
            ),
        },
        {
            title: '',
            key: 'add',
            width: 110,
            align: 'right',
            render: (_, r) => (
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => onAdd(r)}>
                    Agregar
                </Button>
            ),
        },
    ];

    return (
        <Modal title="Agregar capa al evento" open={open} onCancel={onClose} footer={null} width={720}>
            <Space orientation="vertical" style={{ width: '100%' }}>
                {error && <Alert type="error" message={error} showIcon closable />}
                <Input.Search
                    placeholder="Buscar por label, workspace o layer"
                    aria-label="Buscar capa"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                />
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {loading ? 'Cargando capas de GeoServer...' : `${available.length} capas disponibles`}
                    </Text>
                    <Space size={6}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Solo no registradas</Text>
                        <Switch size="small" checked={onlyUnregistered} onChange={setOnlyUnregistered} />
                    </Space>
                </Space>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={available}
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    size="small"
                    tableLayout="fixed"
                />
            </Space>
        </Modal>
    );
}
