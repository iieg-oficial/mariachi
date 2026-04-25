import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Empty,
    Layout,
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
import useIsMobile from '@shared/hooks/useIsMobile';

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

function SortableRow({ item, onRemove, isMobile }) {
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
                gap: isMobile ? 8 : 12,
                padding: isMobile ? '8px 8px' : '10px 12px',
                background: '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                marginBottom: 6,
            }}
        >
            <span
                {...attributes}
                {...listeners}
                style={{ cursor: 'grab', color: '#8c8c8c', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
                aria-label="Arrastrar"
            >
                <HolderOutlined />
            </span>
            <Space orientation="vertical" size={2} style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: isMobile ? 13 : 14, wordBreak: 'break-word' }}>
                    {item.label}
                </Text>
                <Space size={4} wrap>
                    <Tag color="blue" style={{ marginRight: 0, fontSize: 11 }}>{item.id}</Tag>
                    {item.nodeType && <Tag style={{ marginRight: 0, fontSize: 11 }}>{item.nodeType}</Tag>}
                </Space>
            </Space>
            <Button
                danger
                type="text"
                size={isMobile ? 'small' : 'middle'}
                icon={<DeleteOutlined />}
                onClick={() => onRemove(item.id)}
                aria-label={`Quitar ${item.label}`}
                style={{ flexShrink: 0 }}
            />
        </div>
    );
}

export default function InitialLayerOrderPage() {
    const { rawTree, getInitialOrder, setInitialOrder, reload } = useLayerTreeAdmin();
    const { isMobile } = useIsMobile();
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

    const cardActions = (
        <Space size={isMobile ? 4 : 8} wrap>
            <Button
                icon={<PlusOutlined />}
                size={isMobile ? 'small' : 'middle'}
                onClick={() => setAddModalOpen(true)}
                disabled={availableToAdd.length === 0}
            >
                {!isMobile && 'Agregar capa'}
            </Button>
            <Button
                icon={<UndoOutlined />}
                size={isMobile ? 'small' : 'middle'}
                onClick={handleReset}
                disabled={!dirty || saving}
            >
                {!isMobile && 'Descartar'}
            </Button>
            <Button
                type="primary"
                icon={<SaveOutlined />}
                size={isMobile ? 'small' : 'middle'}
                onClick={handleSave}
                loading={saving}
                disabled={!dirty}
            >
                {!isMobile && 'Guardar'}
            </Button>
        </Space>
    );

    return (
        <Content style={{
            padding: isMobile ? 12 : 24,
            maxWidth: 900,
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
        }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Capas iniciales</Title>
                    <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
                        Capas que aparecen activas por defecto en el panel de MapaLab al cargar el mapa.
                        Arrastra para reordenar.
                    </Text>
                </div>

                {error && <Alert type="error" title={error} showIcon closable onClose={() => setError(null)} />}

                <Card
                    title={isMobile
                        ? `${items.length} capa${items.length === 1 ? '' : 's'}`
                        : `${items.length} capa${items.length === 1 ? '' : 's'} activa${items.length === 1 ? '' : 's'}`}
                    extra={cardActions}
                    styles={{
                        body: { padding: isMobile ? 12 : 24 },
                        header: { padding: isMobile ? '8px 12px' : '12px 24px' },
                    }}
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
                                    <SortableRow
                                        key={item.id}
                                        item={item}
                                        onRemove={handleRemove}
                                        isMobile={isMobile}
                                    />
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
                width={isMobile ? '100%' : 520}
                centered={isMobile}
            >
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
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
