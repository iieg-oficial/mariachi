import { useMemo, useState } from 'react';
import { Button, Empty, Input, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined, TagOutlined } from '@ant-design/icons';
import LayerContentDrawer from '@features/mapalab-layers/components/LayerContentDrawer';
import { addCapaToEvento } from '@features/mapalab-eventos/helpers/addCapa';
import { flattenLeaves, useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { useAuth } from '@shared/contexts/useAuth';
import AddCapaModal from './AddCapaModal';

const { Text } = Typography;

export default function CapasField({ value = [], onChange, disabled }) {
    const { rawTree, loading } = useLayerTreeAdmin();
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLayerId, setEditingLayerId] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const registeredIndex = useMemo(() => {
        const m = new Map();
        for (const l of flattenLeaves(rawTree)) m.set(`${l.workspace}/${l.layer}`, l);
        return m;
    }, [rawTree]);

    const taken = useMemo(
        () => new Set(value.map((c) => `${c.workspace}/${c.layer}`)),
        [value],
    );

    const addCapa = (leaf) => addCapaToEvento(leaf, value, onChange, () => setReloadKey((k) => k + 1));

    const addEtiqueta = () => {
        onChange?.([...value, { tipo: 'etiqueta', alias: 'Sección', orden: value.length }]);
    };

    const removeCapa = (idx) => {
        const next = value.filter((_, i) => i !== idx).map((c, i) => ({ ...c, orden: i }));
        onChange?.(next);
    };

    const updateField = (idx, patch) => {
        onChange?.(value.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
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
                            onChange={(e) => updateField(idx, { alias: e.target.value })}
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
                            onChange={(e) => updateField(idx, { alias: e.target.value })}
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
            key: 'autoActivar',
            width: 110,
            align: 'center',
            render: (_, record, idx) => (
                record.tipo === 'etiqueta' ? null : (
                    <Switch
                        size="small"
                        checked={record.autoActivar !== false}
                        onChange={(val) => updateField(idx, { autoActivar: val })}
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
            render: (_, _record, idx) => (
                <Space size={2}>
                    <Button size="small" icon={<ArrowUpOutlined />} aria-label="Mover hacia arriba" disabled={disabled || idx === 0} onClick={() => moveCapa(idx, -1)} />
                    <Button size="small" icon={<ArrowDownOutlined />} aria-label="Mover hacia abajo" disabled={disabled || idx === value.length - 1} onClick={() => moveCapa(idx, 1)} />
                </Space>
            ),
        },
        {
            title: '',
            key: 'acciones',
            width: 90,
            render: (_, record, idx) => {
                const layerId = record.tipo === 'capa' ? registeredIndex.get(`${record.workspace}/${record.layer}`)?.id : null;
                return (
                    <Space size={4}>
                        {record.tipo === 'capa' && (
                            <Tooltip title={layerId ? 'Editar tarjeta, metadatos y simbologia' : 'Agregala al arbol primero'}>
                                <Button size="small" icon={<EditOutlined />} aria-label="Editar capa" disabled={disabled || !layerId} onClick={() => setEditingLayerId(layerId)} />
                            </Tooltip>
                        )}
                        <Button danger size="small" icon={<DeleteOutlined />} aria-label="Eliminar capa" disabled={disabled} onClick={() => removeCapa(idx)} />
                    </Space>
                );
            },
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

            <AddCapaModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onAdd={addCapa}
                isAdmin={isAdmin}
                labelByKey={registeredIndex}
                taken={taken}
                reloadKey={reloadKey}
            />
            <LayerContentDrawer
                open={!!editingLayerId}
                layerId={editingLayerId}
                onClose={() => setEditingLayerId(null)}
            />
        </Space>
    );
}
