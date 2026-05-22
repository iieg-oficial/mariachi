import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Button,
    Card,
    ColorPicker,
    Empty,
    Input,
    InputNumber,
    Modal,
    Radio,
    Select,
    Space,
    Switch,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

import {
    genTextId,
    isTextKey,
    mkTextKey,
    normalizeInfoboxConfig,
    textIdOf,
} from './infoBoxTextBlocks';

const { Text } = Typography;

const STYLE_PRESETS = [
    { key: 'municipio', label: 'Municipio (naranja)', color: '#FF8300', bg: '#FFF2E5' },
    { key: 'caracteristica', label: 'Característica (morado)', color: '#7B61FF', bg: '#F3F0FF' },
    { key: 'institucion', label: 'Institución (azul)', color: '#2E4372', bg: '#F0F0F0' },
    { key: 'estatus_ok', label: 'Estatus OK (verde)', color: '#0FC136', bg: '#DDFFE4' },
    { key: 'submorado', label: 'Sub-morado (claro)', color: '#5C2472', bg: '#F0EAF3' },
];

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

const fieldOptionsFor = (availableFields, currentValues = []) => {
    const opts = (availableFields || []).map((f) => ({
        value: f.name,
        label: (
            <span>
                <span style={{ fontFamily: 'monospace' }}>{f.name}</span>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>{f.type}</Text>
            </span>
        ),
    }));
    const arr = Array.isArray(currentValues) ? currentValues : [currentValues];
    for (const v of arr) {
        if (typeof v === 'string' && v && !opts.find((o) => o.value === v)) {
            opts.unshift({ value: v, label: <span style={{ fontFamily: 'monospace' }}>{v}</span> });
        }
    }
    return opts;
};

const findStylePreset = (color, bg) =>
    STYLE_PRESETS.find((p) => p.color?.toLowerCase() === (color || '').toLowerCase() && p.bg?.toLowerCase() === (bg || '').toLowerCase());

const StylePicker = ({ color, bg, onChange }) => {
    const matched = findStylePreset(color, bg);
    return (
        <Space size={6} wrap>
            <Select
                size="small"
                style={{ width: 200 }}
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

const BlockShell = ({ title, onRemove, children, hint }) => (
    <Card
        size="small"
        title={
            <Space size={6}>
                <Text strong>{title}</Text>
                {hint && <Text type="secondary" style={{ fontSize: 11, fontWeight: 'normal' }}>{hint}</Text>}
            </Space>
        }
        extra={
            <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={onRemove}
                aria-label="Quitar bloque"
            />
        }
        styles={{ body: { paddingTop: 8, paddingBottom: 8 } }}
    >
        {children}
    </Card>
);

const ReorderableBlock = ({ canMoveUp, canMoveDown, onMoveUp, onMoveDown, children }) => (
    <div style={{ position: 'relative' }}>
        <div style={{
            display: 'flex',
            gap: 4,
            position: 'absolute',
            top: 4,
            right: 36,
            zIndex: 1,
        }}>
            <Button
                size="small"
                type="text"
                disabled={!canMoveUp}
                icon={<ArrowUpOutlined />}
                onClick={onMoveUp}
                aria-label="Subir bloque"
            />
            <Button
                size="small"
                type="text"
                disabled={!canMoveDown}
                icon={<ArrowDownOutlined />}
                onClick={onMoveDown}
                aria-label="Bajar bloque"
            />
        </div>
        {children}
    </div>
);

const arrayMove = (arr, from, to) => {
    const next = [...arr];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
};

const computeHeaderMode = (val, fields) => {
    if (!val) return 'field';
    if (!fields?.length) return 'field';
    return fields.find((f) => f.name === val) ? 'field' : 'static';
};

const HeaderFieldBlock = ({ value, onChange, onRemove, availableFields }) => {
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

    const handleToggle = (e) => {
        userTouchedRef.current = true;
        setMode(e.target.value);
    };

    return (
        <BlockShell title="Encabezado (headerField)" onRemove={onRemove} hint="Título grande del cuadro">
            <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                <Radio.Group
                    size="small"
                    value={mode}
                    onChange={handleToggle}
                    optionType="button"
                    options={[
                        { label: 'Campo dinámico', value: 'field' },
                        { label: 'Texto fijo', value: 'static' },
                    ]}
                />
                {mode === 'field' ? (
                    <Select
                        value={value || undefined}
                        onChange={(v) => onChange(v ?? '')}
                        options={fieldOptionsFor(availableFields, value)}
                        placeholder="Selecciona un campo del feature"
                        showSearch
                        allowClear
                        style={{ width: '100%' }}
                        filterOption={(input, option) =>
                            String(option.value).toLowerCase().includes(input.toLowerCase())
                        }
                    />
                ) : (
                    <Input
                        value={value || ''}
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
    const fieldName = isObject ? entry.field : entry;
    const update = (patch) => {
        const base = isObject ? entry : { field: entry };
        onChange({ ...base, ...patch });
    };
    return (
        <Card size="small" type="inner" styles={{ body: { padding: 8 } }}>
            <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                <Space.Compact style={{ width: '100%' }}>
                    <Select
                        style={{ flex: 1 }}
                        value={fieldName || undefined}
                        onChange={(v) => update({ field: v })}
                        options={fieldOptionsFor(availableFields, fieldName)}
                        showSearch
                        placeholder="Campo"
                        filterOption={(input, option) =>
                            String(option.value).toLowerCase().includes(input.toLowerCase())
                        }
                    />
                    <Button danger icon={<DeleteOutlined />} onClick={onRemove} />
                </Space.Compact>
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

const LabelGroupsBlock = ({ value = [], onChange, onRemove, availableFields }) => {
    const updateGroup = (idx, patch) => {
        const next = value.map((g, i) => (i === idx ? { ...g, ...patch } : g));
        onChange(next);
    };
    const removeGroup = (idx) => onChange(value.filter((_, i) => i !== idx));
    const addGroup = () => onChange([...value, { fields: [], color: '#FF8300', bg: '#FFF2E5' }]);

    return (
        <BlockShell title="Etiquetas (labelGroups)" onRemove={onRemove} hint="Badges con colores (ej. municipio, característica)">
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
                                <Radio.Group
                                    size="small"
                                    value={groupKind}
                                    onChange={(e) => setKind(e.target.value)}
                                    optionType="button"
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

const CardsBlock = ({ value = [], columns = 1, onChange, onColumnsChange, onRemove, availableFields }) => {
    const updateItem = (idx, patch) => {
        const next = value.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        onChange(next);
    };
    const removeItem = (idx) => onChange(value.filter((_, i) => i !== idx));
    const addItem = () => onChange([...value, { field: '', label: '' }]);

    return (
        <BlockShell title="Cards (estadísticas)" onRemove={onRemove} hint="Grid de valores numéricos con label">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Space size={6}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Columnas:</Text>
                    <InputNumber size="small" min={1} max={4} value={columns} onChange={(v) => onColumnsChange(v ?? 1)} />
                </Space>
                {value.map((it, idx) => (
                    <Space.Compact key={idx} style={{ width: '100%' }}>
                        <Select
                            style={{ width: 220 }}
                            value={it.field || undefined}
                            onChange={(v) => updateItem(idx, { field: v ?? '' })}
                            options={fieldOptionsFor(availableFields, it.field)}
                            placeholder="Campo"
                            showSearch
                            allowClear
                            filterOption={(input, option) =>
                                String(option.value).toLowerCase().includes(input.toLowerCase())
                            }
                        />
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
                ))}
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>
                    Agregar card
                </Button>
            </Space>
        </BlockShell>
    );
};

const ListBlock = ({ value = [], onChange, onRemove, availableFields }) => {
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

    return (
        <BlockShell title="Lista (list)" onRemove={onRemove} hint="Pares label/valor (formatea fechas y números, link opcional)">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                {value.map((it, idx) => (
                    <div key={idx} style={{ border: '1px dashed #f0f0f0', borderRadius: 4, padding: 8 }}>
                        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                            <Space.Compact style={{ width: '100%' }}>
                                <Select
                                    style={{ width: 220 }}
                                    value={it.field || undefined}
                                    onChange={(v) => updateItem(idx, { field: v ?? '' })}
                                    options={fieldOptionsFor(availableFields, it.field)}
                                    placeholder="Campo"
                                    showSearch
                                    allowClear
                                    filterOption={(input, option) =>
                                        String(option.value).toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                                <Input
                                    value={it.label || ''}
                                    onChange={(e) => updateItem(idx, { label: e.target.value })}
                                    placeholder="Label visible"
                                />
                                <Tooltip title="raw=true: no formatea (muestra tal cual)">
                                    <Button
                                        type={it.raw ? 'primary' : 'default'}
                                        onClick={() => updateItem(idx, { raw: !it.raw })}
                                    >
                                        raw
                                    </Button>
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
                ))}
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>
                    Agregar fila
                </Button>
            </Space>
        </BlockShell>
    );
};

const IconTextBlock = ({ value = [], onChange, onRemove, availableFields }) => {
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

    return (
        <BlockShell title="Íconos con texto (iconText)" onRemove={onRemove} hint="Ícono + valor del campo (web/ubicación/celular abren link automático)">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                {value.map((it, idx) => (
                    <div key={idx} style={{ border: '1px dashed #f0f0f0', borderRadius: 4, padding: 8 }}>
                        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                            <Space.Compact style={{ width: '100%' }}>
                                <Select
                                    style={{ width: 220 }}
                                    value={it.icon || 'ubicacion'}
                                    onChange={(v) => updateItem(idx, { icon: v })}
                                    options={ICON_CATALOG}
                                    showSearch
                                    mode="combobox"
                                    filterOption={(input, option) =>
                                        String(option.value).toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                                <Select
                                    style={{ flex: 1 }}
                                    value={it.field || undefined}
                                    onChange={(v) => updateItem(idx, { field: v ?? '' })}
                                    options={fieldOptionsFor(availableFields, it.field)}
                                    placeholder={it.icon === 'web' ? 'Campo con la URL' : 'Campo a mostrar'}
                                    showSearch
                                    allowClear
                                    filterOption={(input, option) =>
                                        String(option.value).toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                                <Button danger icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
                            </Space.Compact>
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
                ))}
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>
                    Agregar ícono
                </Button>
            </Space>
        </BlockShell>
    );
};

const TextItemRow = ({ item, onChange, onRemove, availableFields }) => {
    const mode = item.field !== undefined ? 'field' : 'static';

    const handleToggle = (e) => {
        const next = e.target.value;
        if (next === 'field') {
            const { label: _l, ...rest } = item;
            onChange({ ...rest, field: rest.field || '' });
        } else {
            const { field: _f, ...rest } = item;
            onChange({ ...rest, label: rest.label || '' });
        }
    };

    const setValue = (v) => onChange({ ...item, [mode === 'field' ? 'field' : 'label']: v ?? '' });

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
                <Space size={6} style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Radio.Group
                        size="small"
                        value={mode}
                        onChange={handleToggle}
                        optionType="button"
                        options={[
                            { label: 'Texto fijo', value: 'static' },
                            { label: 'Campo dinámico', value: 'field' },
                        ]}
                    />
                    <Button
                        danger
                        size="small"
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={onRemove}
                        aria-label="Quitar párrafo"
                    />
                </Space>
                {mode === 'field' ? (
                    <Select
                        value={item.field || undefined}
                        onChange={setValue}
                        options={fieldOptionsFor(availableFields, item.field)}
                        placeholder="Selecciona un campo del feature"
                        showSearch
                        allowClear
                        style={{ width: '100%' }}
                        filterOption={(input, option) =>
                            String(option.value).toLowerCase().includes(input.toLowerCase())
                        }
                    />
                ) : (
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

const TextBlock = ({ block, onChange, onRemove, availableFields }) => {
    const items = block?.items || [];
    const updateItems = (next) => onChange({ ...block, items: next });
    const updateItem = (idx, value) => updateItems(items.map((it, i) => (i === idx ? value : it)));
    const removeItem = (idx) => updateItems(items.filter((_, i) => i !== idx));
    const addItem = () => updateItems([...items, { label: '' }]);

    return (
        <BlockShell title="Texto (párrafos)" onRemove={onRemove} hint="Cada párrafo: texto fijo o valor de un campo">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                {items.map((it, idx) => (
                    <TextItemRow
                        key={idx}
                        item={it}
                        onChange={(next) => updateItem(idx, next)}
                        onRemove={() => removeItem(idx)}
                        availableFields={availableFields}
                    />
                ))}
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>
                    Agregar párrafo
                </Button>
            </Space>
        </BlockShell>
    );
};

const BLOCK_DEFS = [
    { key: 'headerField', label: 'Encabezado', defaultValue: '' },
    { key: 'labelGroups', label: 'Etiquetas', defaultValue: [{ fields: [], color: '#FF8300', bg: '#FFF2E5' }] },
    { key: 'cards', label: 'Cards (estadísticas)', defaultValue: [{ field: '', label: '' }], extras: { cardsColumns: 1 } },
    { key: 'list', label: 'Lista', defaultValue: [{ field: '', label: '' }] },
    { key: 'iconText', label: 'Íconos con texto', defaultValue: [{ icon: 'ubicacion', field: '' }] },
    { key: 'text', label: 'Texto (párrafos)', defaultValue: [{ label: '' }] },
];

const SORTABLE_KEYS = ['labelGroups', 'list', 'iconText', 'text', 'cards'];

const expandSortableKeys = (config) => {
    const out = [];
    for (const k of SORTABLE_KEYS) {
        if (k === 'text') {
            (config.text || []).forEach((b) => out.push(mkTextKey(b.id)));
        } else if (config[k] !== undefined) {
            out.push(k);
        }
    }
    return out;
};

const resolveBodyOrder = (config) => {
    const present = expandSortableKeys(config);
    const explicit = Array.isArray(config.blockOrder)
        ? config.blockOrder.filter((k) => present.includes(k))
        : [];
    const remaining = present.filter((k) => !explicit.includes(k));
    return [...explicit, ...remaining];
};

const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
};

export default function InfoBoxBlocksEditor({ value, onChange, availableFields = [], inherited = null, nodeType = null }) {
    const config = useMemo(() => normalizeInfoboxConfig(value || {}), [value]);

    const update = useCallback((patch) => {
        const next = { ...config, ...patch };
        for (const k of Object.keys(next)) {
            if (next[k] === undefined) delete next[k];
        }
        onChange?.(Object.keys(next).length ? next : null);
    }, [config, onChange]);

    const bodyOrder = resolveBodyOrder(config);
    const headerPresent = config.headerField !== undefined;
    const missingBlocks = BLOCK_DEFS.filter((b) => b.key === 'text' || config[b.key] === undefined);
    const hasAnyBlock = headerPresent || bodyOrder.length > 0;

    const removeBlock = (key) => {
        if (isTextKey(key)) {
            const id = textIdOf(key);
            const nextText = (config.text || []).filter((b) => b.id !== id);
            const patch = { text: nextText.length ? nextText : undefined };
            if (Array.isArray(config.blockOrder) && config.blockOrder.includes(key)) {
                const nextOrder = config.blockOrder.filter((k) => k !== key);
                patch.blockOrder = nextOrder.length ? nextOrder : undefined;
            }
            update(patch);
            return;
        }
        const patch = { [key]: undefined };
        if (key === 'cards') patch.cardsColumns = undefined;
        if (Array.isArray(config.blockOrder) && config.blockOrder.includes(key)) {
            const nextOrder = config.blockOrder.filter((k) => k !== key);
            patch.blockOrder = nextOrder.length ? nextOrder : undefined;
        }
        update(patch);
    };

    const addBlock = (key) => {
        if (key === 'text') {
            const newBlock = { id: genTextId(), items: [{ label: '' }] };
            const nextText = Array.isArray(config.text) ? [...config.text, newBlock] : [newBlock];
            update({ text: nextText });
            return;
        }
        const def = BLOCK_DEFS.find((b) => b.key === key);
        if (!def) return;
        const patch = { [key]: def.defaultValue };
        if (def.extras) Object.assign(patch, def.extras);
        update(patch);
    };

    const moveBlock = (idx, delta) => {
        const target = idx + delta;
        if (target < 0 || target >= bodyOrder.length) return;
        const nextOrder = arrayMove(bodyOrder, idx, target);
        const defaultOrder = expandSortableKeys(config);
        update({ blockOrder: arraysEqual(nextOrder, defaultOrder) ? undefined : nextOrder });
    };

    const renderBodyBlock = (key) => {
        if (key === 'labelGroups') {
            return (
                <LabelGroupsBlock
                    value={config.labelGroups}
                    onChange={(v) => update({ labelGroups: v.length ? v : undefined })}
                    onRemove={() => removeBlock('labelGroups')}
                    availableFields={availableFields}
                />
            );
        }
        if (key === 'cards') {
            return (
                <CardsBlock
                    value={config.cards}
                    columns={config.cardsColumns ?? 1}
                    onChange={(v) => update({ cards: v.length ? v : undefined })}
                    onColumnsChange={(v) => update({ cardsColumns: v })}
                    onRemove={() => removeBlock('cards')}
                    availableFields={availableFields}
                />
            );
        }
        if (key === 'list') {
            return (
                <ListBlock
                    value={config.list}
                    onChange={(v) => update({ list: v.length ? v : undefined })}
                    onRemove={() => removeBlock('list')}
                    availableFields={availableFields}
                />
            );
        }
        if (key === 'iconText') {
            return (
                <IconTextBlock
                    value={config.iconText}
                    onChange={(v) => update({ iconText: v.length ? v : undefined })}
                    onRemove={() => removeBlock('iconText')}
                    availableFields={availableFields}
                />
            );
        }
        if (isTextKey(key)) {
            const id = textIdOf(key);
            const block = (config.text || []).find((b) => b.id === id);
            if (!block) return null;
            return (
                <TextBlock
                    block={block}
                    onChange={(nextBlock) => {
                        const nextText = (config.text || []).map((b) => (b.id === id ? nextBlock : b));
                        update({ text: nextText });
                    }}
                    onRemove={() => removeBlock(key)}
                    availableFields={availableFields}
                />
            );
        }
        return null;
    };

    const hasOwnConfig = !!value && Object.keys(value || {}).length > 0;
    const inheriting = !hasOwnConfig && !!inherited;

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {config.headerTransform && (
                <Tag color="orange" style={{ whiteSpace: 'normal', height: 'auto', padding: '4px 8px' }}>
                    Esta capa usa <code>headerTransform</code> avanzado (mapeo o sufijos por feature). Se preserva al guardar pero no se edita aquí.
                </Tag>
            )}

            {nodeType === 'group' && (
                <div style={{
                    background: '#F0F7FF',
                    border: '1px solid #91CAFF',
                    borderRadius: 6,
                    padding: '8px 12px',
                }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        El cuadro definido en este <b>grupo</b> se hereda automáticamente a todos sus descendientes
                        (capas y filtros) que no tengan uno propio. Si una capa hija configura su propio infobox,
                        sobrescribe lo que herede de aquí.
                    </Text>
                </div>
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

            {missingBlocks.length > 0 && (
                <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Agregar bloque:
                    </Text>
                    <Space wrap size={6}>
                        {missingBlocks.map((b) => (
                            <Button
                                key={b.key}
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => addBlock(b.key)}
                            >
                                {b.label}
                            </Button>
                        ))}
                    </Space>
                </div>
            )}

            {!hasAnyBlock && (
                <Empty description="Sin bloques. Agrega uno arriba para empezar." />
            )}

            {headerPresent && (
                <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                        Encabezado (siempre se renderiza arriba como título):
                    </Text>
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
                        Bloques del cuerpo (usa las flechas para reordenar):
                    </Text>
                    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                        {bodyOrder.map((key, idx) => (
                            <ReorderableBlock
                                key={key}
                                canMoveUp={idx > 0}
                                canMoveDown={idx < bodyOrder.length - 1}
                                onMoveUp={() => moveBlock(idx, -1)}
                                onMoveDown={() => moveBlock(idx, 1)}
                            >
                                {renderBodyBlock(key)}
                            </ReorderableBlock>
                        ))}
                    </Space>
                </div>
            )}
        </Space>
    );
}
