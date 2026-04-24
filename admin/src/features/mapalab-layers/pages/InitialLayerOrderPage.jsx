import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Empty,
    Layout,
    List,
    Modal,
    Select,
    Space,
    Spin,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    DeleteOutlined,
    HolderOutlined,
    PlusOutlined,
    SaveOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';

const { Content } = Layout;
const { Title, Text } = Typography;

function flattenTree(nodes, acc = []) {
    for (const n of nodes || []) {
        acc.push({
            id: n.id,
            label: n.label,
            nodeType: n.nodeType,
            parentId: n.raw?.parentId ?? null,
        });
        if (n.children?.length) flattenTree(n.children, acc);
    }
    return acc;
}

function SortableRow({ item, onRemove }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                background: '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                marginBottom: 6,
            }}
        >
            <span
                {...attributes}
                {...listeners}
                style={{ cursor: 'grab', color: '#8c8c8c', fontSize: 18, lineHeight: 1 }}
                aria-label="Arrastrar"
            >
                <HolderOutlined />
            </span>
            <Space direction="vertical" size={0} style={{ flex: 1, minWidth: 0 }}>
                <Text strong>{item.label}</Text>
                <Space size={8}>
                    <Tag color="blue">{item.id}</Tag>
                    {item.nodeType && <Tag>{item.nodeType}</Tag>}
                </Space>
            </Space>
            <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => onRemove(item.id)}
                aria-label={`Quitar ${item.label}`}
            />
        </div>
    );
}

export default function InitialLayerOrderPage() {
    const { rawTree, getInitialOrder, setInitialOrder, reload } = useLayerTreeAdmin();
    const [items, setItems] = useState([]);
    const [original, setOriginal] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [pendingAddId, setPendingAddId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const allLayersFlat = useMemo(() => flattenTree(rawTree), [rawTree]);

    const allLayersMap = useMemo(() => {
        const map = new Map();
        for (const l of allLayersFlat) map.set(l.id, l);
        return map;
    }, [allLayersFlat]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getInitialOrder();
            const normalized = data.map((d) => ({
                id: d.layerId,
                label: d.label,
                nodeType: d.nodeType,
                parentId: d.parentId,
            }));
            setItems(normalized);
            setOriginal(normalized);
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar capas iniciales');
        } finally {
            setLoading(false);
        }
    }, [getInitialOrder]);

    useEffect(() => {
        load();
    }, [load]);

    const dirty = useMemo(() => {
        if (items.length !== original.length) return true;
        for (let i = 0; i < items.length; i += 1) {
            if (items[i].id !== original[i].id) return true;
        }
        return false;
    }, [items, original]);

    const availableToAdd = useMemo(() => {
        const taken = new Set(items.map((i) => i.id));
        return allLayersFlat.filter((l) => !taken.has(l.id) && l.nodeType === 'leaf');
    }, [allLayersFlat, items]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setItems((prev) => {
            const oldIndex = prev.findIndex((i) => i.id === active.id);
            const newIndex = prev.findIndex((i) => i.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const handleRemove = (layerId) => {
        setItems((prev) => prev.filter((i) => i.id !== layerId));
    };

    const handleAddConfirm = () => {
        if (!pendingAddId) return;
        const layer = allLayersMap.get(pendingAddId);
        if (!layer) return;
        setItems((prev) => [...prev, layer]);
        setPendingAddId(null);
        setAddModalOpen(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setInitialOrder(items.map((i) => i.id));
            message.success('Orden de capas iniciales guardado');
            setOriginal(items);
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setItems(original);
    };

    return (
        <Content style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>Capas iniciales</Title>
                    <Text type="secondary">
                        Capas que aparecen activas por defecto en el panel de MapaLab al cargar el mapa.
                        Arrastra para reordenar.
                    </Text>
                </div>

                {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

                <Card
                    title={`${items.length} capa${items.length === 1 ? '' : 's'} activa${items.length === 1 ? '' : 's'}`}
                    extra={
                        <Space>
                            <Button
                                icon={<PlusOutlined />}
                                onClick={() => setAddModalOpen(true)}
                                disabled={availableToAdd.length === 0}
                            >
                                Agregar capa
                            </Button>
                            <Button
                                icon={<UndoOutlined />}
                                onClick={handleReset}
                                disabled={!dirty || saving}
                            >
                                Descartar
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={handleSave}
                                loading={saving}
                                disabled={!dirty}
                            >
                                Guardar
                            </Button>
                        </Space>
                    }
                >
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Spin />
                        </div>
                    ) : items.length === 0 ? (
                        <Empty description="No hay capas iniciales configuradas" />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={items.map((i) => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {items.map((item) => (
                                    <SortableRow key={item.id} item={item} onRemove={handleRemove} />
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}
                </Card>
            </Space>

            <Modal
                title="Agregar capa al panel inicial"
                open={addModalOpen}
                onOk={handleAddConfirm}
                onCancel={() => { setAddModalOpen(false); setPendingAddId(null); }}
                okText="Agregar"
                cancelText="Cancelar"
                okButtonProps={{ disabled: !pendingAddId }}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text type="secondary">
                        Solo se listan capas hoja que aún no están en el orden inicial.
                    </Text>
                    <Select
                        showSearch
                        style={{ width: '100%' }}
                        placeholder="Buscar capa por id o label"
                        value={pendingAddId}
                        onChange={setPendingAddId}
                        filterOption={(input, option) =>
                            option.searchText.toLowerCase().includes(input.toLowerCase())
                        }
                        options={availableToAdd.map((l) => ({
                            value: l.id,
                            label: `${l.label} (${l.id})`,
                            searchText: `${l.label} ${l.id}`,
                        }))}
                    />
                </Space>
            </Modal>
        </Content>
    );
}
