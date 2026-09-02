import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Button,
    Card,
    ColorPicker,
    Empty,
    Input,
    InputNumber,
    Modal,
    Segmented,
    Select,
    Space,
    Switch,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    RedoOutlined,
    UndoOutlined,
    FontSizeOutlined,
    HolderOutlined,
    PlusOutlined,
    SplitCellsOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove as dndArrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { normalizeInfoboxConfig } from './infoBoxTextBlocks';
import { useInfoboxUndo } from '@features/mapalab-layers/hooks/useInfoboxUndo';
import {
    BLOCK_DEFS,
    blockDef,
    blockInstances,
    naturalOrder,
    planAddBlock,
    planDuplicateBlock,
    planRemoveBlock,
    planSetBlockItems,
    resolveBodyOrder,
    typeOfKey,
} from '@features/mapalab-layers/constants/infoboxBlocks';
import { FieldValueField } from './FieldValueField.jsx';
import { fieldOptionsFor, isComposed, withValueDef } from './fieldValueHelpers.jsx';
import { MUNICIPIO_STYLE, STYLE_PRESETS } from '@features/mapalab-layers/constants/infoboxStyles';

const { Text } = Typography;

const ICON_CATALOG = [
    { value: 'ubicacion', label: 'Ubicación (abre Google Maps)' },
    { value: 'celular', label: 'Teléfono (abre marcador)' },
    { value: 'web', label: 'Sitio web' },
    { value: 'hombre', label: 'Hombre' },
    { value: 'mujer', label: 'Mujer' },
    { value: 'info', label: 'Info' },
    { value: 'novedades', label: 'Novedades' },
    { value: 'aviso_privacidad', label: 'Aviso de privacidad' },
];

const findStylePreset = (color, bg) =>
    STYLE_PRESETS.find((p) => p.color?.toLowerCase() === (color || '').toLowerCase() && p.bg?.toLowerCase() === (bg || '').toLowerCase());

const StylePicker = ({ color, bg, onChange }) => {
    const matched = findStylePreset(color, bg);
    return (
        <Space size={6} wrap>
            <Select
                size="small"
                style={{ flex: 1, minWidth: 140, maxWidth: 200 }}
                value={matched?.key || 'custom'}
                onChange={(k) => {
                    if (k === 'custom') return;
                    const preset = STYLE_PRESETS.find((p) => p.key === k);
                    onChange({ color: preset.color, bg: preset.bg });
                }}
                options={[
                    ...STYLE_PRESETS.map((p) => ({
                        value: p.key,
                        label: (
                            <Space size={6}>
                                <span style={{
                                    display: 'inline-block', width: 12, height: 12,
                                    background: p.bg, border: `2px solid ${p.color}`, borderRadius: 3,
                                }} />
                                {p.label}
                            </Space>
                        ),
                    })),
                    { value: 'custom', label: 'Personalizado' },
                ]}
            />
            <Tooltip title="Color del texto">
                <ColorPicker
                    size="small"
                    value={color || '#000000'}
                    onChange={(c) => onChange({ color: c.toHexString(), bg })}
                />
            </Tooltip>
            <Tooltip title="Color de fondo">
                <ColorPicker
                    size="small"
                    value={bg || '#FFFFFF'}
                    onChange={(c) => onChange({ color, bg: c.toHexString() })}
                />
            </Tooltip>
        </Space>
    );
};

const BlockShell = ({ title, onRemove, onDuplicate, children, hint, bare = false }) => (bare ? (
    <div>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>{hint}</Text>
        {children}
    </div>
) : (
    <Card
        size="small"
        title={
            <Tooltip title={hint}>
                <Text strong style={{ cursor: hint ? 'help' : undefined }}>{title}</Text>
            </Tooltip>
        }
        extra={
            <Space size={0}>
                {onDuplicate && (
                    <Tooltip title="Duplicar este bloque">
                        <Button
                            size="small"
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={onDuplicate}
                            aria-label="Duplicar bloque"
                        />
                    </Tooltip>
                )}
                <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={onRemove}
                    aria-label="Quitar bloque"
                />
            </Space>
        }
        styles={{ body: { paddingTop: 8, paddingBottom: 8 } }}
    >
        {children}
    </Card>
));

const DragHandle = ({ attributes, listeners, label = 'Arrastrar para reordenar', style: extraStyle = {} }) => (
    <Button
        type="text"
        size="small"
        icon={<HolderOutlined />}
        aria-label={label}
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', touchAction: 'none', ...extraStyle }}
    />
);

const SortableBlock = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: 'relative',
    };
    return (
        <div ref={setNodeRef} style={style} data-block-key={id}>
            <div style={{ position: 'absolute', top: 4, right: 62, zIndex: 1 }}>
                <DragHandle attributes={attributes} listeners={listeners} label="Arrastrar bloque" />
            </div>
            {children}
        </div>
    );
};

const SortableItem = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 4,
    };
    return (
        <div ref={setNodeRef} style={style}>
            <DragHandle attributes={attributes} listeners={listeners} label="Arrastrar item" style={{ marginTop: 4 }} />
            <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        </div>
    );
};

const itemIdsFor = (arr) => arr.map((_, idx) => `item-${idx}`);
const indexFromItemId = (id) => Number(String(id).replace(/^item-/, ''));

const computeHeaderMode = (val, fields) => {
    if (isComposed(val)) return 'compose';
    if (!val || typeof val !== 'string') return 'field';
    if (!fields?.length) return 'field';
    return fields.find((f) => f.name === val) ? 'field' : 'static';
};

export const HeaderFieldBlock = ({ bare = false,  value, onChange, onRemove, availableFields }) => {
    const [mode, setMode] = useState(() => computeHeaderMode(value, availableFields));
    const userTouchedRef = useRef(false);
    const lastValueRef = useRef(value);

    useEffect(() => {
        const valueChanged = value !== lastValueRef.current;
        if (valueChanged) {
            userTouchedRef.current = false;
            lastValueRef.current = value;
        }
        if (!userTouchedRef.current) {
            setMode(computeHeaderMode(value, availableFields));
        }
    }, [value, availableFields]);

    const handleModeChange = (next) => {
        userTouchedRef.current = true;
        setMode(next);
        if (next === 'static' && typeof value !== 'string') onChange('');
    };

    return (
        <BlockShell bare={bare} title="Encabezado" onRemove={onRemove} hint={blockDef('headerField').hint}>
            <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                <FieldValueField
                    value={typeof value === 'string' ? { field: value } : value}
                    onChange={(next) => onChange(next.field !== undefined ? next.field : next)}
                    availableFields={availableFields}
                    placeholder="Selecciona un campo del feature"
                    mode={mode}
                    onModeChange={handleModeChange}
                    extraModes={[{ label: 'Texto fijo', value: 'static' }]}
                />
                {mode === 'static' && (
                    <Input
                        value={typeof value === 'string' ? value : ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Texto literal del encabezado (ej. Límites municipales administrativos IIEG)"
                    />
                )}
            </Space>
        </BlockShell>
    );
};

const NestedFieldEditor = ({ entry, onChange, onRemove, availableFields, parentStyle }) => {
    const isObject = entry && typeof entry === 'object';
    const base = isObject ? entry : { field: entry };
    const update = (patch) => onChange({ ...base, ...patch });
    return (
        <Card size="small" type="inner" styles={{ body: { padding: 8 } }}>
            <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                <Space.Compact style={{ width: '100%', minWidth: 0, alignItems: 'flex-start' }}>
                    <FieldValueField
                        value={base}
                        onChange={(next) => onChange(withValueDef(base, next))}
                        availableFields={availableFields}
                    />
                    <Button danger icon={<DeleteOutlined />} onClick={onRemove} />
                </Space.Compact>
                <Space size={6}>
                    <Switch
                        size="small"
                        checked={isObject ? !!entry.split : false}
                        onChange={(v) => update({ split: v || undefined })}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>parte el valor por «; »</Text>
                </Space>
                <StylePicker
                    color={isObject ? entry.color : parentStyle?.color}
                    bg={isObject ? entry.bg : parentStyle?.bg}
                    onChange={(s) => update(s)}
                />
                <Space size={6}>
                    <Switch
                        size="small"
                        checked={isObject ? !!entry.fullWidth : false}
                        onChange={(v) => update({ fullWidth: v })}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>fullWidth</Text>
                </Space>
            </Space>
        </Card>
    );
};

export const LabelGroupsBlock = ({ bare = false,  value = [], onChange, onRemove, onDuplicate, availableFields }) => {
    const updateGroup = (idx, patch) => {
        const next = value.map((g, i) => (i === idx ? { ...g, ...patch } : g));
        onChange(next);
    };
    const removeGroup = (idx) => onChange(value.filter((_, i) => i !== idx));
    const addGroup = () => onChange([...value, { fields: [], ...MUNICIPIO_STYLE }]);

    return (
        <BlockShell bare={bare} title="Etiquetas" onRemove={onRemove} onDuplicate={onDuplicate} hint={blockDef('labelGroups').hint}>
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                {value.map((g, idx) => {
                    const groupKind = g.staticValues !== undefined ? 'static' : 'fields';
                    const setKind = (kind) => {
                        if (kind === 'static') {
                            const fromFields = (g.fields || []).filter((f) => typeof f === 'string');
                            updateGroup(idx, { fields: undefined, staticValues: fromFields });
                        } else {
                            updateGroup(idx, { staticValues: undefined, fields: (g.staticValues || []).map((s) => typeof s === 'string' ? s : '') });
                        }
                    };
                    const hasNested = (g.fields || []).some((f) => f && typeof f === 'object');
                    const simpleFields = (g.fields || []).filter((f) => typeof f === 'string');
                    const nestedFields = (g.fields || []).filter((f) => f && typeof f === 'object');
                    return (
                        <Card
                            key={idx}
                            size="small"
                            type="inner"
                            title={`Grupo ${idx + 1}`}
                            extra={
                                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeGroup(idx)} />
                            }
                        >
                            <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                                <Segmented
                                    value={groupKind}
                                    onChange={setKind}
                                    options={[
                                        { label: 'Campos del feature', value: 'fields' },
                                        { label: 'Valores fijos', value: 'static' },
                                    ]}
                                />

                                {groupKind === 'fields' ? (
                                    <>
                                        <Select
                                            mode="multiple"
                                            value={simpleFields}
                                            onChange={(v) => updateGroup(idx, { fields: [...v, ...nestedFields] })}
                                            options={fieldOptionsFor(availableFields, simpleFields)}
                                            placeholder="Campos a mostrar como etiquetas"
                                            style={{ width: '100%' }}
                                            showSearch
                                            allowClear
                                            filterOption={(input, option) =>
                                                String(option.value).toLowerCase().includes(input.toLowerCase())
                                            }
                                        />
                                        {hasNested && (
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                                                    Campos con styling propio:
                                                </Text>
                                                <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                                                    {nestedFields.map((entry, ei) => (
                                                        <NestedFieldEditor
                                                            key={ei}
                                                            entry={entry}
                                                            availableFields={availableFields}
                                                            parentStyle={{ color: g.color, bg: g.bg }}
                                                            onChange={(updated) => {
                                                                const nextNested = nestedFields.map((e2, i2) => i2 === ei ? updated : e2);
                                                                updateGroup(idx, { fields: [...simpleFields, ...nextNested] });
                                                            }}
                                                            onRemove={() => {
                                                                const nextNested = nestedFields.filter((_, i2) => i2 !== ei);
                                                                updateGroup(idx, { fields: [...simpleFields, ...nextNested] });
                                                            }}
                                                        />
                                                    ))}
                                                </Space>
                                            </div>
                                        )}
                                        <Button
                                            type="dashed"
                                            size="small"
                                            icon={<PlusOutlined />}
                                            onClick={() => updateGroup(idx, {
                                                fields: [...(g.fields || []), { field: '', color: g.color, bg: g.bg }],
                                            })}
                                        >
                                            Agregar campo con styling propio
                                        </Button>
                                    </>
                                ) : (
                                    <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                                        {(g.staticValues || []).map((sv, si) => {
                                            const isObj = sv && typeof sv === 'object';
                                            const text = isObj ? (sv.fallback || '') : (sv || '');
                                            return (
                                                <Space.Compact key={si} style={{ width: '100%' }}>
                                                    <Input
                                                        value={text}
                                                        onChange={(e) => {
                                                            const next = [...g.staticValues];
                                                            next[si] = isObj ? { ...sv, fallback: e.target.value } : e.target.value;
                                                            updateGroup(idx, { staticValues: next });
                                                        }}
                                                        placeholder={isObj ? `Fallback (dynamic: ${sv.dynamic || '—'})` : 'Texto literal'}
                                                    />
                                                    <Button danger icon={<DeleteOutlined />} onClick={() => updateGroup(idx, { staticValues: g.staticValues.filter((_, i2) => i2 !== si) })} />
                                                </Space.Compact>
                                            );
                                        })}
                                        <Button
                                            type="dashed"
                                            size="small"
                                            icon={<PlusOutlined />}
                                            onClick={() => updateGroup(idx, { staticValues: [...(g.staticValues || []), ''] })}
                                        >
                                            Agregar valor
                                        </Button>
                                    </Space>
                                )}

                                <StylePicker
                                    color={g.color}
                                    bg={g.bg}
                                    onChange={(s) => updateGroup(idx, s)}
                                />
                                <Space size={6}>
                                    <Switch
                                        size="small"
                                        checked={!!g.fullWidth}
                                        onChange={(v) => updateGroup(idx, { fullWidth: v })}
                                    />
                                    <Text type="secondary" style={{ fontSize: 12 }}>fullWidth (badge ocupa toda la fila)</Text>
                                </Space>
                            </Space>
                        </Card>
                    );
                })}
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addGroup} block>
                    Agregar grupo de etiquetas
                </Button>
            </Space>
        </BlockShell>
    );
};

export const CardsBlock = ({ bare = false,  value = [], columns = 1, onChange, onColumnsChange, onRemove, onDuplicate, availableFields }) => {
    const updateItem = (idx, patch) => {
        const next = value.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        onChange(next);
    };
    const removeItem = (idx) => onChange(value.filter((_, i) => i !== idx));
    const addItem = () => onChange([...value, { field: '', label: '' }]);
    const setValueDef = (idx, next) => onChange(value.map((it, i) => (i === idx ? withValueDef(it, next) : it)));
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const itemIds = itemIdsFor(value);
    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIdx = indexFromItemId(active.id);
        const newIdx = indexFromItemId(over.id);
        onChange(dndArrayMove(value, oldIdx, newIdx));
    };

    return (
        <BlockShell bare={bare} title="Cards (estadísticas)" onRemove={onRemove} onDuplicate={onDuplicate} hint={blockDef('cards').hint}>
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Space size={6}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Columnas:</Text>
                    <InputNumber size="small" min={1} max={4} value={columns} onChange={(v) => onColumnsChange(v ?? 1)} />
                </Space>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                            {value.map((it, idx) => (
                                <SortableItem key={itemIds[idx]} id={itemIds[idx]}>
                                    <div style={{ border: '1px dashed #f0f0f0', borderRadius: 4, padding: 8 }}>
                                        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                                            <FieldValueField
                                                value={it}
                                                onChange={(next) => setValueDef(idx, next)}
                                                availableFields={availableFields}
                                                allowSum
                                            />
                                            <Space.Compact style={{ width: '100%', minWidth: 0 }}>
                                                <Input
                                                    value={it.label || ''}
                                                    onChange={(e) => updateItem(idx, { label: e.target.value })}
                                                    placeholder="Label visible (ej. Razón de dependencia)"
                                                />
                                                <Tooltip title="Decimales para formatear (vacío = sin formateo)">
                                                    <InputNumber
                                                        style={{ width: 90 }}
                                                        min={0}
                                                        max={6}
                                                        value={it.decimals ?? null}
                                                        placeholder="dec."
                                                        onChange={(v) => updateItem(idx, { decimals: v ?? undefined })}
                                                    />
                                                </Tooltip>
                                                <Button danger icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
                                            </Space.Compact>
                                        </Space>
                                    </div>
                                </SortableItem>
                            ))}
                        </Space>
                    </SortableContext>
                </DndContext>
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>
                    Agregar card
                </Button>
            </Space>
        </BlockShell>
    );
};

export const ListBlock = ({ bare = false,  value = [], onChange, onRemove, onDuplicate, availableFields }) => {
    const updateItem = (idx, patch) => {
        const next = value.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        onChange(next);
    };
    const setHref = (idx, v) => {
        const it = value[idx];
        if (v) {
            updateItem(idx, { href: v });
        } else {
            const { href: _h, ...rest } = it;
            const next = value.map((curr, i) => (i === idx ? rest : curr));
            onChange(next);
        }
    };
    const removeItem = (idx) => onChange(value.filter((_, i) => i !== idx));
    const addItem = () => onChange([...value, { field: '', label: '' }]);
    const setValueDef = (idx, next) => onChange(value.map((it, i) => (i === idx ? withValueDef(it, next) : it)));
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const itemIds = itemIdsFor(value);
    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIdx = indexFromItemId(active.id);
        const newIdx = indexFromItemId(over.id);
        onChange(dndArrayMove(value, oldIdx, newIdx));
    };

    return (
        <BlockShell bare={bare} title="Lista" onRemove={onRemove} onDuplicate={onDuplicate} hint={blockDef('list').hint}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        {value.map((it, idx) => (
                            <SortableItem key={itemIds[idx]} id={itemIds[idx]}>
                                <div style={{ border: '1px dashed #f0f0f0', borderRadius: 4, padding: 8 }}>
                                    <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                                        <FieldValueField
                                            value={it}
                                            onChange={(next) => setValueDef(idx, next)}
                                            availableFields={availableFields}
                                        />
                                        <Space.Compact style={{ width: '100%', minWidth: 0 }}>
                                            <Input
                                                value={it.label || ''}
                                                onChange={(e) => updateItem(idx, { label: e.target.value })}
                                                placeholder="Label visible"
                                            />
                                            <Tooltip title="Sin formato: muestra el valor tal cual, sin tocar fechas ni números">
                                                <Button
                                                    type={it.raw ? 'primary' : 'default'}
                                                    icon={<FontSizeOutlined />}
                                                    onClick={() => updateItem(idx, { raw: !it.raw })}
                                                    aria-label="Sin formato"
                                                />
                                            </Tooltip>
                                            <Tooltip title="Multivalor: parte el valor por «; » y lo muestra como varios renglones">
                                                <Button
                                                    type={it.split ? 'primary' : 'default'}
                                                    icon={<SplitCellsOutlined />}
                                                    onClick={() => updateItem(idx, { split: it.split ? undefined : true })}
                                                    aria-label="Multivalor"
                                                />
                                            </Tooltip>
                                            <Button danger icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
                                        </Space.Compact>
                                        <Input
                                            size="small"
                                            value={it.href || ''}
                                            onChange={(e) => setHref(idx, e.target.value)}
                                            placeholder="Link (opcional). Soporta tokens: https://ejemplo.gob.mx/{clave_catastral}"
                                            addonBefore={<Text type="secondary" style={{ fontSize: 11 }}>Link</Text>}
                                        />
                                    </Space>
                                </div>
                            </SortableItem>
                        ))}
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>
                            Agregar fila
                        </Button>
                    </Space>
                </SortableContext>
            </DndContext>
        </BlockShell>
    );
};

export const IconTextBlock = ({ bare = false,  value = [], onChange, onRemove, onDuplicate, availableFields }) => {
    const updateItem = (idx, patch) => {
        const next = value.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        onChange(next);
    };
    const setOptional = (idx, key, v) => {
        const it = value[idx];
        if (v) {
            updateItem(idx, { [key]: v });
        } else {
            const { [key]: _drop, ...rest } = it;
            const next = value.map((curr, i) => (i === idx ? rest : curr));
            onChange(next);
        }
    };
    const removeItem = (idx) => onChange(value.filter((_, i) => i !== idx));
    const addItem = () => onChange([...value, { icon: 'ubicacion', field: '' }]);
    const setValueDef = (idx, next) => onChange(value.map((it, i) => (i === idx ? withValueDef(it, next) : it)));
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const itemIds = itemIdsFor(value);
    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIdx = indexFromItemId(active.id);
        const newIdx = indexFromItemId(over.id);
        onChange(dndArrayMove(value, oldIdx, newIdx));
    };

    return (
        <BlockShell bare={bare} title="Íconos con texto" onRemove={onRemove} onDuplicate={onDuplicate} hint={blockDef('iconText').hint}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        {value.map((it, idx) => (
                            <SortableItem key={itemIds[idx]} id={itemIds[idx]}>
                                <div style={{ border: '1px dashed #f0f0f0', borderRadius: 4, padding: 8 }}>
                                    <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                                        <Space.Compact style={{ width: '100%', minWidth: 0 }}>
                                            <Select
                                                style={{ flex: 1 }}
                                                value={it.icon || 'ubicacion'}
                                                onChange={(v) => updateItem(idx, { icon: v })}
                                                options={ICON_CATALOG}
                                                showSearch
                                                mode="combobox"
                                                filterOption={(input, option) =>
                                                    String(option.value).toLowerCase().includes(input.toLowerCase())
                                                }
                                            />
                                            <Button danger icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
                                        </Space.Compact>
                                        <FieldValueField
                                            value={it}
                                            onChange={(next) => setValueDef(idx, next)}
                                            availableFields={availableFields}
                                            placeholder={it.icon === 'web' ? 'Campo con la URL' : 'Campo a mostrar'}
                                        />
                                        <Input
                                            size="small"
                                            value={it.label || ''}
                                            onChange={(e) => setOptional(idx, 'label', e.target.value)}
                                            placeholder={it.icon === 'web' ? 'Texto visible (ej. "Sitio oficial"). Si lo dejas vacío, muestra la URL.' : 'Texto visible (opcional, sobrescribe el valor del campo)'}
                                            addonBefore={<Text type="secondary" style={{ fontSize: 11 }}>Texto</Text>}
                                        />
                                        <Input
                                            size="small"
                                            value={it.href || ''}
                                            onChange={(e) => setOptional(idx, 'href', e.target.value)}
                                            placeholder="Link explícito (opcional). Soporta tokens: https://ejemplo.gob.mx/{clave_catastral}"
                                            addonBefore={<Text type="secondary" style={{ fontSize: 11 }}>Link</Text>}
                                        />
                                    </Space>
                                </div>
                            </SortableItem>
                        ))}
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>
                            Agregar ícono
                        </Button>
                    </Space>
                </SortableContext>
            </DndContext>
        </BlockShell>
    );
};

const TextItemRow = ({ item, onChange, onRemove, availableFields }) => {
    const mode = isComposed(item) ? 'compose' : (item.field !== undefined ? 'field' : 'static');

    const setValueDef = (next) => {
        const { label: _l, ...rest } = withValueDef(item, {});
        onChange({ ...rest, ...next });
    };

    const handleModeChange = (next) => {
        if (next === 'static') onChange({ ...withValueDef(item, {}), label: item.label || '' });
    };

    const setValue = (v) => onChange({ ...item, label: v ?? '' });

    const setHref = (value) => {
        if (value) {
            onChange({ ...item, href: value });
        } else {
            const { href: _h, ...rest } = item;
            onChange(rest);
        }
    };

    return (
        <div style={{ border: '1px dashed #f0f0f0', borderRadius: 4, padding: 8 }}>
            <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', width: '100%' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <FieldValueField
                            value={item}
                            onChange={setValueDef}
                            availableFields={availableFields}
                            placeholder="Selecciona un campo del feature"
                            mode={mode}
                            onModeChange={handleModeChange}
                            extraModes={[{ label: 'Texto fijo', value: 'static' }]}
                        />
                    </div>
                    <Button
                        danger
                        size="small"
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={onRemove}
                        aria-label="Quitar párrafo"
                    />
                </div>
                {mode === 'static' && (
                    <Input.TextArea
                        value={item.label || ''}
                        onChange={(e) => setValue(e.target.value)}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        placeholder="Texto del párrafo"
                    />
                )}
                <Input
                    size="small"
                    value={item.href || ''}
                    onChange={(e) => setHref(e.target.value)}
                    placeholder="Link (opcional). Soporta tokens: https://ejemplo.gob.mx/{clave_catastral}"
                    addonBefore={<Text type="secondary" style={{ fontSize: 11 }}>Link</Text>}
                />
            </Space>
        </div>
    );
};

export const TextBlock = ({ bare = false,  value = [], onChange, onRemove, onDuplicate, availableFields }) => {
    const items = value;
    const updateItems = (next) => onChange(next);
    const updateItem = (idx, value) => updateItems(items.map((it, i) => (i === idx ? value : it)));
    const removeItem = (idx) => updateItems(items.filter((_, i) => i !== idx));
    const addItem = () => updateItems([...items, { label: '' }]);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const itemIds = itemIdsFor(items);
    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIdx = indexFromItemId(active.id);
        const newIdx = indexFromItemId(over.id);
        updateItems(dndArrayMove(items, oldIdx, newIdx));
    };

    return (
        <BlockShell bare={bare} title="Texto (párrafos)" onRemove={onRemove} onDuplicate={onDuplicate} hint={blockDef('text').hint}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        {items.map((it, idx) => (
                            <SortableItem key={itemIds[idx]} id={itemIds[idx]}>
                                <TextItemRow
                                    item={it}
                                    onChange={(next) => updateItem(idx, next)}
                                    onRemove={() => removeItem(idx)}
                                    availableFields={availableFields}
                                />
                            </SortableItem>
                        ))}
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>
                            Agregar párrafo
                        </Button>
                    </Space>
                </SortableContext>
            </DndContext>
        </BlockShell>
    );
};

const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
};

export default function InfoBoxBlocksEditor({ value, onChange, availableFields = [], inherited = null, nodeType = null }) {
    const config = useMemo(() => normalizeInfoboxConfig(value || {}), [value]);
    const rootRef = useRef(null);
    const [focusKey, setFocusKey] = useState(null);
    const { undo, redo, canUndo, canRedo } = useInfoboxUndo(value, onChange);

    useEffect(() => {
        if (!focusKey) return;
        const id = requestAnimationFrame(() => {
            const el = rootRef.current?.querySelector(`[data-block-key="${focusKey}"]`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setFocusKey(null);
        });
        return () => cancelAnimationFrame(id);
    }, [focusKey]);

    const update = useCallback((patch) => {
        const next = { ...config, ...patch };
        for (const k of Object.keys(next)) {
            if (next[k] === undefined) delete next[k];
        }
        onChange?.(Object.keys(next).length ? next : null);
    }, [config, onChange]);

    const bodyOrder = resolveBodyOrder(config);
    const headerPresent = config.headerField !== undefined;
    const missingBlocks = BLOCK_DEFS.filter((b) => (b.key === 'headerField'
        ? !headerPresent
        : blockInstances(config, b.key).length === 0));
    const hasAnyBlock = headerPresent || bodyOrder.length > 0;

    const aplicar = (plan) => {
        if (!plan) return;
        update(plan.patch);
        if (plan.focusKey) setFocusKey(plan.focusKey);
    };

    const removeBlock = (key) => {
        if (key === 'headerField') {
            update({ headerField: undefined });
            return;
        }
        aplicar(planRemoveBlock(config, bodyOrder, key));
    };

    const setBlockItems = (key, items) => aplicar(planSetBlockItems(config, bodyOrder, key, items));

    const addBlock = (type) => {
        if (type === 'headerField') {
            update({ headerField: '' });
            setFocusKey('headerField');
            return;
        }
        aplicar(planAddBlock(config, bodyOrder, type));
    };

    const duplicateBlock = (key) => aplicar(planDuplicateBlock(config, bodyOrder, key));

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    const handleBlocksDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIdx = bodyOrder.indexOf(active.id);
        const newIdx = bodyOrder.indexOf(over.id);
        if (oldIdx === -1 || newIdx === -1) return;
        const nextOrder = dndArrayMove(bodyOrder, oldIdx, newIdx);
        update({ blockOrder: arraysEqual(nextOrder, naturalOrder(config)) ? undefined : nextOrder });
    };

    const renderBodyBlock = (key) => {
        const type = typeOfKey(key);
        const instancia = blockInstances(config, type).find((i) => i.key === key);
        if (!instancia) return null;
        const comunes = {
            value: instancia.items,
            onChange: (items) => setBlockItems(key, items),
            onRemove: () => removeBlock(key),
            onDuplicate: () => duplicateBlock(key),
            availableFields,
        };
        if (type === 'labelGroups') return <LabelGroupsBlock {...comunes} />;
        if (type === 'list') return <ListBlock {...comunes} />;
        if (type === 'iconText') return <IconTextBlock {...comunes} />;
        if (type === 'text') return <TextBlock {...comunes} />;
        if (type === 'cards') {
            return (
                <CardsBlock
                    {...comunes}
                    columns={config.cardsColumns ?? 1}
                    onColumnsChange={(v) => update({ cardsColumns: v })}
                />
            );
        }
        return null;
    };

    const hasOwnConfig = !!value && Object.keys(value || {}).length > 0;
    const inheriting = !hasOwnConfig && !!inherited;

    return (
        <div ref={rootRef} style={{ width: '100%', minWidth: 0 }}>
            <Space orientation="vertical" size="middle" style={{ width: '100%', minWidth: 0 }}>
                {config.headerTransform && (
                    <Tag color="orange" style={{ whiteSpace: 'normal', height: 'auto', padding: '4px 8px' }}>
                    Esta capa usa <code>headerTransform</code> avanzado (mapeo o sufijos por feature). Se preserva al guardar pero no se edita aquí.
                    </Tag>
                )}

                {inheriting && (
                    <div style={{
                        background: '#F6FFED',
                        border: '1px solid #B7EB8F',
                        borderRadius: 6,
                        padding: '10px 12px',
                    }}>
                        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                            <Text strong>
                            Heredando del grupo: <code>{inherited.label}</code>
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                            Esta capa no tiene un cuadro propio. Está mostrando el cuadro definido en el grupo padre.
                            Si necesitas un cuadro distinto solo para esta capa, créalo personalizado.
                            </Text>
                            <Space size={6}>
                                <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => {
                                        Modal.confirm({
                                            title: '¿Crear cuadro personalizado para esta capa?',
                                            content: (
                                                <span>
                                                Vas a crear una copia editable del cuadro del grupo
                                                    {' '}<code>{inherited.label}</code>{' '}
                                                solo para esta capa. A partir de ahora, los cambios al cuadro del grupo
                                                    <b> ya no se propagarán</b> a esta capa hasta que vuelvas a heredar.
                                                </span>
                                            ),
                                            okText: 'Sí, personalizar',
                                            cancelText: 'Cancelar',
                                            onOk: () => onChange(JSON.parse(JSON.stringify(inherited.config))),
                                        });
                                    }}
                                >
                                Personalizar para esta capa
                                </Button>
                            </Space>
                        </Space>
                    </div>
                )}

                {hasOwnConfig && inherited && nodeType !== 'group' && (
                    <div style={{
                        background: '#FFF7E6',
                        border: '1px solid #FFD591',
                        borderRadius: 6,
                        padding: '8px 12px',
                    }}>
                        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                            Esta capa tiene <b>cuadro personalizado</b> que sobrescribe al del grupo
                                {' '}<code>{inherited.label}</code>.
                            </Text>
                            <Button
                                size="small"
                                danger
                                onClick={() => {
                                    Modal.confirm({
                                        title: '¿Eliminar cuadro personalizado y volver a heredar?',
                                        content: (
                                            <span>
                                            Vas a borrar el cuadro propio de esta capa y volver a usar el del grupo
                                                {' '}<code>{inherited.label}</code>.
                                            Los cambios futuros al cuadro del grupo se propagarán automáticamente.
                                                <b> Esta acción no se puede deshacer.</b>
                                            </span>
                                        ),
                                        okText: 'Sí, volver a heredar',
                                        okButtonProps: { danger: true },
                                        cancelText: 'Cancelar',
                                        onOk: () => onChange(null),
                                    });
                                }}
                            >
                            Quitar personalización y volver a heredar
                            </Button>
                        </Space>
                    </div>
                )}

                {!hasOwnConfig && !inherited && nodeType === 'leaf' && (
                    <div style={{
                        background: '#FAFAFA',
                        border: '1px dashed #D9D9D9',
                        borderRadius: 6,
                        padding: '8px 12px',
                    }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                        Esta capa no tiene cuadro propio y ningún grupo ancestro tiene uno definido. El visor
                        generará uno por defecto inferido de las propiedades del feature.
                        </Text>
                    </div>
                )}

                {(canUndo || canRedo) && (
                    <Space size={6}>
                        <Tooltip title="Deshacer (Ctrl+Z)">
                            <Button size="small" icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} aria-label="Deshacer" />
                        </Tooltip>
                        <Tooltip title="Rehacer (Ctrl+Shift+Z)">
                            <Button size="small" icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} aria-label="Rehacer" />
                        </Tooltip>
                    </Space>
                )}

                {missingBlocks.length > 0 && (
                    <div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Agregar bloque:
                        </Text>
                        <Space wrap size={6}>
                            {missingBlocks.map((b) => (
                                <Tooltip key={b.key} title={b.hint}>
                                    <Button
                                        size="small"
                                        icon={<PlusOutlined />}
                                        onClick={() => addBlock(b.key)}
                                    >
                                        {b.label}
                                    </Button>
                                </Tooltip>
                            ))}
                        </Space>
                    </div>
                )}

                {!hasAnyBlock && (
                    <Empty description="Agrega un bloque para empezar." />
                )}

                {headerPresent && (
                    <div data-block-key="headerField">
                        <HeaderFieldBlock
                            value={config.headerField ?? ''}
                            onChange={(v) => update({ headerField: v ?? '' })}
                            onRemove={() => removeBlock('headerField')}
                            availableFields={availableFields}
                        />
                    </div>
                )}

                {bodyOrder.length > 0 && (
                    <div>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                        Arrastra ⋮⋮ para reordenar.
                        </Text>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleBlocksDragEnd}
                        >
                            <SortableContext items={bodyOrder} strategy={verticalListSortingStrategy}>
                                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                                    {bodyOrder.map((key) => (
                                        <SortableBlock key={key} id={key}>
                                            {renderBodyBlock(key)}
                                        </SortableBlock>
                                    ))}
                                </Space>
                            </SortableContext>
                        </DndContext>
                    </div>
                )}
            </Space>
        </div>
    );
}
