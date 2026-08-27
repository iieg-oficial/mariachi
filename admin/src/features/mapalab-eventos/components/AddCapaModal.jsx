import { useEffect, useMemo, useReducer, useState } from 'react';
import { Alert, Button, Input, Modal, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '@shared/services/api';

const { Text } = Typography;

const ELLIPSIS = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 };

function workspacesReducer(state, action) {
    switch (action.type) {
    case 'fetching':
        return { ...state, loading: true, error: null };
    case 'success':
        return { data: action.data, loading: false, error: null };
    case 'error':
        return { data: [], loading: false, error: action.error };
    default:
        return state;
    }
}

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
    const [draftLabels, setDraftLabels] = useState({});
    const [{ data: gsWorkspaces, loading, error }, dispatch] = useReducer(
        workspacesReducer,
        { data: [], loading: false, error: null },
    );

    useEffect(() => {
        if (!open) return undefined;
        setDraftLabels({});
        let cancelled = false;
        dispatch({ type: 'fetching' });
        const params = isAdmin ? { include_unregistered: true } : {};
        api.get('/geoserver/workspaces', { params })
            .then((res) => { if (!cancelled) dispatch({ type: 'success', data: res.data || [] }); })
            .catch((err) => {
                if (!cancelled) dispatch({
                    type: 'error',
                    error: err?.response?.data?.detail || 'No se pudo conectar a GeoServer. Reintenta o avisa al admin.',
                });
            });
        return () => { cancelled = true; };
    }, [open, isAdmin, reloadKey]);

    const normalizeForCompare = (value) =>
        (value || '').trim().toLowerCase().replace(/[_\s-]/g, '');

    const getDraftLabel = (r) => (r.registered ? r.label : (draftLabels[r.id] ?? ''));

    const isLabelValid = (r) => {
        if (r.registered) return true;
        const candidate = (draftLabels[r.id] || '').trim();
        if (!candidate) return false;
        return normalizeForCompare(candidate) !== normalizeForCompare(r.layer);
    };

    const handleAdd = (r) => {
        const finalLabel = r.registered ? r.label : (draftLabels[r.id] || '').trim();
        onAdd({ ...r, label: finalLabel });
    };

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
                    label: reg?.label || '',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {r.registered ? (
                            <Tooltip title={r.label} mouseEnterDelay={0.5}>
                                <span style={ELLIPSIS}>{r.label}</span>
                            </Tooltip>
                        ) : (
                            <Input
                                size="small"
                                placeholder="Escribe un nombre humano (distinto al identificador)"
                                value={getDraftLabel(r)}
                                onChange={(e) => setDraftLabels((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                status={(draftLabels[r.id] ?? '') && !isLabelValid(r) ? 'error' : ''}
                                style={{ flex: 1, minWidth: 0 }}
                            />
                        )}
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
            render: (_, r) => {
                const valid = isLabelValid(r);
                const tooltip = r.registered
                    ? ''
                    : (!draftLabels[r.id] ? 'Escribe un nombre para esta capa' : (!valid ? 'El nombre debe ser distinto al identificador GeoServer' : ''));
                return (
                    <Tooltip title={tooltip}>
                        <Button
                            size="small"
                            type="primary"
                            icon={<PlusOutlined />}
                            disabled={!valid}
                            onClick={() => handleAdd(r)}
                        >
                            Agregar
                        </Button>
                    </Tooltip>
                );
            },
        },
    ];

    return (
        <Modal title="Agregar capa al evento" open={open} onCancel={onClose} footer={null} width={720}>
            <Space orientation="vertical" style={{ width: '100%' }}>
                {error && <Alert type="error" title={error} showIcon closable />}
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
