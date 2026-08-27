import { useMemo, useState } from 'react';
import { Button, Empty, Select, Space, Table, Typography } from 'antd';
import { ApartmentOutlined, PlusOutlined, TagOutlined } from '@ant-design/icons';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LayerContentDrawer from '@features/mapalab-layers/components/LayerContentDrawer';
import { addCapaToEvento } from '@features/mapalab-eventos/helpers/addCapa';
import { flattenLeaves, useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { useAuth } from '@shared/contexts/useAuth';
import AddCapaModal from './AddCapaModal';
import { buildCapasColumns } from './capasTableColumns';
import { CapasSortableRow } from './CapasSortableRow';

const { Text } = Typography;

const reorder = (list) => list.map((c, i) => ({ ...c, orden: i }));

const collectTaken = (list) => {
    const set = new Set();
    const walk = (items) => {
        for (const c of items || []) {
            if (c.tipo === 'capa') set.add(`${c.workspace}/${c.layer}`);
            if (c.tipo === 'categoria') walk(c.capas);
        }
    };
    walk(list);
    return set;
};

const itemKey = (r, i) => {
    if (r.tipo === 'etiqueta') return `etiqueta-${i}`;
    if (r.tipo === 'categoria') return `categoria-${i}`;
    return `${r.workspace}/${r.layer}`;
};

const collectCapas = (list, out = []) => {
    for (const c of list || []) {
        if (c.tipo === 'capa') out.push(c);
        if (c.tipo === 'categoria') collectCapas(c.capas, out);
    }
    return out;
};

const setAbrirDetalleExclusivo = (list, targetKey) => (list || []).map((c) => {
    if (c.tipo === 'categoria') {
        return { ...c, capas: setAbrirDetalleExclusivo(c.capas, targetKey) };
    }
    if (c.tipo !== 'capa') return c;
    const should = `${c.workspace}/${c.layer}` === targetKey;
    return !!c.abrirDetalle === should ? c : { ...c, abrirDetalle: should };
});

const rootRowKey = (r, i) => `root::${itemKey(r, i)}`;
const childRowKey = (catIdx) => (r, i) => `cat-${catIdx}::${itemKey(r, i)}`;

const TABLE_COMPONENTS = { body: { row: CapasSortableRow } };

export default function CapasField({ value = [], onChange, disabled }) {
    const { rawTree, loading } = useLayerTreeAdmin();
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';
    const [modalOpen, setModalOpen] = useState(false);
    const [addingToCategoria, setAddingToCategoria] = useState(null);
    const [editingLayerId, setEditingLayerId] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const registeredIndex = useMemo(() => {
        const m = new Map();
        for (const l of flattenLeaves(rawTree)) m.set(`${l.workspace}/${l.layer}`, l);
        return m;
    }, [rawTree]);

    const taken = useMemo(() => collectTaken(value), [value]);

    const detalleCapas = useMemo(() => collectCapas(value), [value]);
    const detalleValue = useMemo(() => {
        const found = detalleCapas.find((c) => c.abrirDetalle);
        return found ? `${found.workspace}/${found.layer}` : undefined;
    }, [detalleCapas]);
    const handleDetalleChange = (key) => onChange?.(setAbrirDetalleExclusivo(value, key ?? null));

    const replaceChildren = (catIdx, nextChildren) => {
        onChange?.(value.map((c, i) => (
            i === catIdx ? { ...c, capas: reorder(nextChildren) } : c
        )));
    };

    const containerItems = (containerId) => (containerId === 'root'
        ? value
        : (value[parseInt(containerId.split('-')[1], 10)]?.capas || []));

    const replaceContainer = (containerId, nextList) => {
        if (containerId === 'root') return onChange?.(reorder(nextList));
        const idx = parseInt(containerId.split('-')[1], 10);
        return replaceChildren(idx, nextList);
    };

    const moveItemAcrossContainers = (srcContainer, srcIdx, dstContainer) => {
        if (srcContainer === dstContainer) return;
        const srcList = containerItems(srcContainer);
        const item = srcList[srcIdx];
        if (!item) return;
        if (item.tipo === 'categoria' && dstContainer !== 'root') return;
        const dstList = containerItems(dstContainer);
        const removed = srcList.filter((_, i) => i !== srcIdx);
        const inserted = [...dstList, item];
        if (srcContainer === 'root' && dstContainer.startsWith('cat-')) {
            const dstIdx = parseInt(dstContainer.split('-')[1], 10);
            const adjustedDst = srcIdx < dstIdx ? dstIdx - 1 : dstIdx;
            const nextRoot = removed.map((c, i) => (
                i === adjustedDst ? { ...c, capas: reorder(inserted) } : c
            ));
            return onChange?.(reorder(nextRoot));
        }
        if (srcContainer.startsWith('cat-') && dstContainer === 'root') {
            const srcCatIdx = parseInt(srcContainer.split('-')[1], 10);
            const nextRoot = value.map((c, i) => (
                i === srcCatIdx ? { ...c, capas: reorder(removed) } : c
            ));
            return onChange?.(reorder([...nextRoot, item]));
        }
        const srcCatIdx = parseInt(srcContainer.split('-')[1], 10);
        const dstCatIdx = parseInt(dstContainer.split('-')[1], 10);
        const nextRoot = value.map((c, i) => {
            if (i === srcCatIdx) return { ...c, capas: reorder(removed) };
            if (i === dstCatIdx) return { ...c, capas: reorder(inserted) };
            return c;
        });
        return onChange?.(nextRoot);
    };

    const handleDragEnd = (containerId) => (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const list = containerItems(containerId);
        const oldIndex = list.findIndex((r, i) => itemKey(r, i) === active.id.split('::')[1]);
        const newIndex = list.findIndex((r, i) => itemKey(r, i) === over.id.split('::')[1]);
        if (oldIndex < 0 || newIndex < 0) return;
        replaceContainer(containerId, arrayMove(list, oldIndex, newIndex));
    };

    const onAddCapa = (leaf) => {
        if (addingToCategoria === null) {
            return addCapaToEvento(leaf, value, (next) => onChange?.(next), () => setReloadKey((k) => k + 1));
        }
        const children = value[addingToCategoria]?.capas || [];
        return addCapaToEvento(
            leaf,
            children,
            (next) => replaceChildren(addingToCategoria, next),
            () => setReloadKey((k) => k + 1),
        );
    };

    const openAddCapaModal = (catIdx = null) => {
        setAddingToCategoria(catIdx);
        setModalOpen(true);
    };

    const addEtiquetaRoot = () => {
        onChange?.([...value, { tipo: 'etiqueta', alias: 'Sección', orden: value.length }]);
    };

    const addCategoria = () => {
        onChange?.([
            ...value,
            { tipo: 'categoria', alias: 'Categoría', orden: value.length, capas: [] },
        ]);
    };

    const addEtiquetaIn = (catIdx) => {
        const children = value[catIdx]?.capas || [];
        replaceChildren(catIdx, [...children, { tipo: 'etiqueta', alias: 'Sección', orden: children.length }]);
    };

    const handlersFor = (containerId) => {
        const list = containerItems(containerId);
        const setList = (next) => replaceContainer(containerId, next);
        return {
            onUpdate: (idx, patch) => setList(list.map((c, i) => (i === idx ? { ...c, ...patch } : c))),
            onRemove: (idx) => setList(list.filter((_, i) => i !== idx)),
            onMoveTo: (idx, dst) => moveItemAcrossContainers(containerId, idx, dst),
        };
    };

    const columnsFor = (containerId) => buildCapasColumns({
        ...handlersFor(containerId),
        disabled,
        registeredIndex,
        onEditLayer: setEditingLayerId,
        containerId,
        rootValue: value,
    });

    const renderCategoriaChildren = (record, catIdx) => {
        const children = record.capas || [];
        const containerId = `cat-${catIdx}`;
        return (
            <div style={{ padding: '8px 0 8px 24px', background: '#fafafa' }}>
                <Space style={{ justifyContent: 'flex-end', width: '100%', marginBottom: 8 }} wrap>
                    <Button size="small" icon={<TagOutlined />} onClick={() => addEtiquetaIn(catIdx)} disabled={disabled}>
                        Agregar etiqueta
                    </Button>
                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openAddCapaModal(catIdx)} disabled={disabled || loading}>
                        Agregar capa
                    </Button>
                </Space>
                {children.length === 0 ? (
                    <Empty description="Sin elementos en esta categoría" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(containerId)}>
                        <SortableContext items={children.map((r, i) => childRowKey(catIdx)(r, i))} strategy={verticalListSortingStrategy}>
                            <Table
                                rowKey={childRowKey(catIdx)}
                                columns={columnsFor(containerId)}
                                dataSource={children}
                                pagination={false}
                                size="small"
                                showHeader={false}
                                components={TABLE_COMPONENTS}
                            />
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        );
    };

    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Arrastra el handle (≡) para reordenar el menú lateral del evento (lo que ve el usuario). Las categorías solo viven en la raíz. Para controlar qué capa aparece encima de otra en el mapa, usa la columna <Text strong>Z</Text>.
                </Text>
                <Space size={6} wrap>
                    <Button icon={<TagOutlined />} onClick={addEtiquetaRoot} disabled={disabled}>
                        Agregar etiqueta
                    </Button>
                    <Button icon={<ApartmentOutlined />} onClick={addCategoria} disabled={disabled}>
                        Agregar categoría
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddCapaModal(null)} disabled={disabled || loading}>
                        Agregar capa
                    </Button>
                </Space>
            </Space>

            {detalleCapas.length > 0 && (
                <Space size={8} align="center" wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Capa cuyo detalle se abre automáticamente al abrir el evento:
                    </Text>
                    <Select
                        size="small"
                        allowClear
                        placeholder="Ninguna"
                        style={{ minWidth: 280 }}
                        value={detalleValue}
                        onChange={handleDetalleChange}
                        options={detalleCapas.map((c) => ({
                            value: `${c.workspace}/${c.layer}`,
                            label: c.alias || c.layer,
                        }))}
                        disabled={disabled}
                    />
                </Space>
            )}

            {value.length === 0 ? (
                <Empty description="Sin capas asignadas" />
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd('root')}>
                    <SortableContext items={value.map((r, i) => rootRowKey(r, i))} strategy={verticalListSortingStrategy}>
                        <Table
                            rowKey={rootRowKey}
                            columns={columnsFor('root')}
                            dataSource={value}
                            pagination={false}
                            size="small"
                            components={TABLE_COMPONENTS}
                            expandable={{
                                expandedRowRender: (record, idx) => renderCategoriaChildren(record, idx),
                                rowExpandable: (record) => record.tipo === 'categoria',
                                defaultExpandAllRows: true,
                            }}
                        />
                    </SortableContext>
                </DndContext>
            )}

            <AddCapaModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onAdd={onAddCapa}
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
