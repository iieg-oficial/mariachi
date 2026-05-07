import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, Modal, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined, TagOutlined } from '@ant-design/icons';
import LayerContentDrawer from '@features/mapalab-layers/components/LayerContentDrawer';
import { addCapaToEvento } from '@features/mapalab-eventos/helpers/addCapa';
import { flattenLeaves, useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { useAuth } from '@shared/contexts/useAuth';
import api from '@shared/services/api';

const { Text } = Typography;

export default function CapasField({ value = [], onChange, disabled }) {
    const { rawTree, loading } = useLayerTreeAdmin();
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [onlyUnregistered, setOnlyUnregistered] = useState(false);
    const [gsWorkspaces, setGsWorkspaces] = useState([]);
    const [loadingGs, setLoadingGs] = useState(false);
    const [editingLayerId, setEditingLayerId] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const registeredLeaves = useMemo(() => flattenLeaves(rawTree), [rawTree]);

    const leafIdByKey = useMemo(
        () => new Map(registeredLeaves.map((l) => [`${l.workspace}/${l.layer}`, l.id])),
        [registeredLeaves],
    );

    const labelByKey = useMemo(() => {
        const m = new Map();
        for (const l of registeredLeaves) m.set(`${l.workspace}/${l.layer}`, l.label);
        return m;
    }, [registeredLeaves]);

    useEffect(() => {
        if (!modalOpen) return;
        let cancelled = false;
        setLoadingGs(true);
        const params = isAdmin ? { include_unregistered: true } : {};
        api.get('/geoserver/workspaces', { params })
            .then((res) => { if (!cancelled) setGsWorkspaces(res.data || []); })
            .catch(() => { if (!cancelled) setGsWorkspaces([]); })
            .finally(() => { if (!cancelled) setLoadingGs(false); });
        return () => { cancelled = true; };
    }, [modalOpen, isAdmin, reloadKey]);

    const taken = useMemo(
        () => new Set(value.map((c) => `${c.workspace}/${c.layer}`)),
        [value],
    );

    const allCandidates = useMemo(() => {
        const out = [];
        for (const ws of gsWorkspaces || []) {
            const wsRegistered = ws.registered !== false;
            const wsAlias = ws.alias || ws.geoserverWorkspace;
            for (const layerName of ws.layers || []) {
                const key = `${wsAlias}/${layerName}`;
                const registeredLabel = labelByKey.get(key);
                out.push({
                    id: key,
                    workspace: wsAlias,
                    geoserverWorkspace: ws.geoserverWorkspace,
                    workspaceRegistered: wsRegistered,
                    layer: layerName,
                    label: registeredLabel || layerName,
                    registered: Boolean(registeredLabel),
                });
            }
        }
        return out;
    }, [gsWorkspaces, labelByKey]);

    const available = useMemo(() => {
        let filtered = allCandidates.filter((l) => !taken.has(`${l.workspace}/${l.layer}`));
        if (onlyUnregistered) filtered = filtered.filter((l) => !l.registered);
        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter((l) =>
                l.label.toLowerCase().includes(q) ||
                l.layer.toLowerCase().includes(q) ||
                l.workspace.toLowerCase().includes(q),
            );
        }
        return filtered;
    }, [allCandidates, taken, search, onlyUnregistered]);

    const addCapa = (leaf) => addCapaToEvento(leaf, value, onChange, () => setReloadKey((k) => k + 1));

    const addEtiqueta = () => {
        const next = [
            ...value,
            { tipo: 'etiqueta', alias: 'Sección', orden: value.length },
        ];
        onChange?.(next);
    };

    const removeCapa = (idx) => {
        const next = value.filter((_, i) => i !== idx).map((c, i) => ({ ...c, orden: i }));
        onChange?.(next);
    };

    const updateAlias = (idx, alias) => {
        const next = value.map((c, i) => (i === idx ? { ...c, alias } : c));
        onChange?.(next);
    };

    const updateAutoActivar = (idx, val) => {
        const next = value.map((c, i) => (i === idx ? { ...c, auto_activar: val } : c));
        onChange?.(next);
    };

    const moveCapa = (idx, dir) => {
        const target = idx + dir;
        if (target < 0 || target >= value.length) return;
        const next = [...value];
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange?.(next.map((c, i) => ({ ...c, orden: i })));
    };

    const columns = [
        {
            title: 'Capa / Etiqueta',
            key: 'capa',
            render: (_, record, idx) => (
                record.tipo === 'etiqueta' ? (
                    <Space size={6} style={{ width: '100%' }}>
                        <Tag color="purple" style={{ marginRight: 0 }}>Etiqueta</Tag>
                        <Input
                            size="small"
                            placeholder="Texto de la etiqueta (ej. Servicios públicos)"
                            value={record.alias || ''}
                            onChange={(e) => updateAlias(idx, e.target.value)}
                            disabled={disabled}
                            style={{ minWidth: 240 }}
                        />
                    </Space>
                ) : (
                    <Space orientation="vertical" size={0}>
                        <Tag color="blue">{record.workspace}:{record.layer}</Tag>
                        <Input
                            size="small"
                            placeholder="Alias mostrado en el panel"
                            value={record.alias || ''}
                            onChange={(e) => updateAlias(idx, e.target.value)}
                            disabled={disabled}
                            style={{ marginTop: 4, maxWidth: 320 }}
                        />
                    </Space>
                )
            ),
        },
        {
            title: (
                <Tooltip title="Si está activado, la capa se enciende sola al abrir el evento. Si está apagado, el usuario debe activarla manualmente desde el panel.">
                    <span>Auto-activar</span>
                </Tooltip>
            ),
            key: 'auto_activar',
            width: 110,
            align: 'center',
            render: (_, record, idx) => (
                record.tipo === 'etiqueta' ? (
                    <Text type="secondary" style={{ fontSize: 11 }}></Text>
                ) : (
                    <Switch
                        size="small"
                        checked={record.auto_activar !== false}
                        onChange={(val) => updateAutoActivar(idx, val)}
                        disabled={disabled}
                        checkedChildren="Auto"
                        unCheckedChildren="Manual"
                    />
                )
            ),
        },
        {
            title: 'Orden',
            key: 'orden',
            width: 110,
            render: (_, record, idx) => (
                <Space size={2}>
                    <Button size="small" icon={<ArrowUpOutlined />} disabled={disabled || idx === 0} onClick={() => moveCapa(idx, -1)} />
                    <Button size="small" icon={<ArrowDownOutlined />} disabled={disabled || idx === value.length - 1} onClick={() => moveCapa(idx, 1)} />
                </Space>
            ),
        },
        {
            title: '',
            key: 'acciones',
            width: 90,
            render: (_, record, idx) => {
                const layerId = record.tipo === 'capa' ? leafIdByKey.get(`${record.workspace}/${record.layer}`) : null;
                return (
                    <Space size={4}>
                        {record.tipo === 'capa' && (
                            <Tooltip title={layerId ? 'Editar tarjeta, metadatos y simbologia' : 'Agregala al arbol primero'}>
                                <Button size="small" icon={<EditOutlined />} disabled={disabled || !layerId} onClick={() => setEditingLayerId(layerId)} />
                            </Tooltip>
                        )}
                        <Button danger size="small" icon={<DeleteOutlined />} disabled={disabled} onClick={() => removeCapa(idx)} />
                    </Space>
                );
            },
        },
    ];

    const modalColumns = [
        {
            title: 'Capa',
            key: 'label',
            render: (_, r) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <Tooltip title={r.label} mouseEnterDelay={0.5}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                {r.label}
                            </span>
                        </Tooltip>
                        {r.registered ? (
                            <Tag color="green" style={{ fontSize: 10, marginRight: 0, flexShrink: 0 }}>en árbol</Tag>
                        ) : (
                            <Tag color="gold" style={{ fontSize: 10, marginRight: 0, flexShrink: 0 }}>solo GeoServer</Tag>
                        )}
                    </div>
                    <Tooltip title={`${r.workspace}:${r.layer}`} mouseEnterDelay={0.5}>
                        <Text type="secondary" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
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
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => addCapa(r)}>
                    Agregar
                </Button>
            ),
        },
    ];

    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Capas y etiquetas que aparecerán en el panel del evento. Reordena con los botones.
                </Text>
                <Space size={6} wrap>
                    <Button icon={<TagOutlined />} onClick={addEtiqueta} disabled={disabled}>
                        Agregar etiqueta
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} disabled={disabled || loading}>
                        Agregar capa
                    </Button>
                </Space>
            </Space>

            {value.length === 0 ? (
                <Empty description="Sin capas asignadas" />
            ) : (
                <Table
                    rowKey={(r, i) => (r.tipo === 'etiqueta' ? `etiqueta-${i}` : `${r.workspace}/${r.layer}`)}
                    columns={columns}
                    dataSource={value}
                    pagination={false}
                    size="small"
                />
            )}

            <Modal
                title="Agregar capa al evento"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={720}
            >
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Input.Search
                        placeholder="Buscar por label, workspace o layer"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                    />
                    <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {loadingGs ? 'Cargando capas de GeoServer...' : `${available.length} capas disponibles`}
                        </Text>
                        <Space size={6}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Solo no registradas</Text>
                            <Switch size="small" checked={onlyUnregistered} onChange={setOnlyUnregistered} />
                        </Space>
                    </Space>
                    <Table
                        rowKey="id"
                        columns={modalColumns}
                        dataSource={available}
                        loading={loadingGs}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        size="small"
                        tableLayout="fixed"
                    />
                </Space>
            </Modal>
            <LayerContentDrawer
                open={!!editingLayerId}
                layerId={editingLayerId}
                onClose={() => setEditingLayerId(null)}
            />
        </Space>
    );
}
