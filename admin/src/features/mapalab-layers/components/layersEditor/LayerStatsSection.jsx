import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, InputNumber, Modal, Radio, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import {
    ClockCircleOutlined,
    DeleteOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import StatusBadge from '@shared/components/StatusBadge';
import StatsFiltersEditor from './StatsFiltersEditor';
import StatsPreviewContext from './StatsPreviewContext';
import StatsPreviewGrid from './StatsPreviewGrid';

const MAX_EXPRESSION_DEPTH = 6;

const OPS_WITHOUT_FIELD = new Set(['count', 'count_where']);

const labelWithBeta = (text) => (
    <>
        {text}
        <StatusBadge
            variant="beta"
            size="sm"
            style={{
                position: 'absolute',
                top: -10,
                right: 0,
            }}
        />
    </>
);

const { Text } = Typography;

const PRIMITIVE_OPS = [
    { value: 'count', label: 'count — total de filas' },
    { value: 'count_distinct', label: 'count_distinct — únicos por columna' },
    { value: 'count_where', label: 'count_where — filas donde columna = valor' },
    { value: 'sum', label: 'sum — suma de columna' },
    { value: 'avg', label: 'avg — promedio' },
    { value: 'min', label: 'min — valor mínimo' },
    { value: 'max', label: 'max — valor máximo' },
    { value: 'latest', label: 'latest — último valor por columna ordenadora' },
];

const COMBINATOR_OPS = [
    { value: 'add', label: '+ suma' },
    { value: 'sub', label: '− resta' },
    { value: 'mul', label: '× multiplicación' },
    { value: 'div', label: '÷ división' },
    { value: 'percent', label: '% porcentaje (a/b × 100)' },
    { value: 'percent_change', label: 'Δ% cambio porcentual' },
];

const FORMATS = [
    { value: '', label: 'Sin formato' },
    { value: 'integer', label: 'Entero' },
    { value: 'decimal_2', label: 'Decimal (2 dec)' },
    { value: 'percentage', label: 'Porcentaje' },
    { value: 'currency_mxn', label: 'Moneda (MXN)' },
    { value: 'compact', label: 'Compacto (1.2K)' },
];

const TTL_UNITS = [
    { value: 'min', label: 'minutos', factor: 1 },
    { value: 'hour', label: 'horas', factor: 60 },
    { value: 'day', label: 'días', factor: 1440 },
];

const pickBestUnit = (minutes) => {
    if (minutes >= 1440 && minutes % 1440 === 0) return 'day';
    if (minutes >= 60 && minutes % 60 === 0) return 'hour';
    return 'min';
};

const TtlInput = ({ value, onChange }) => {
    const [unit, setUnit] = useState(() => pickBestUnit(value || 0));
    const factor = TTL_UNITS.find((u) => u.value === unit)?.factor || 1;
    const displayValue = factor ? Math.round((value || 0) / factor) : 0;
    const min = Math.max(1, Math.ceil(5 / factor));
    const max = Math.floor(43200 / factor);
    return (
        <Space.Compact style={{ width: 'auto' }}>
            <InputNumber
                size="small"
                min={min}
                max={max}
                value={displayValue}
                onChange={(v) => onChange((v ?? min) * factor)}
            />
            <Select
                size="small"
                value={unit}
                onChange={setUnit}
                options={TTL_UNITS.map((u) => ({ value: u.value, label: u.label }))}
                style={{ width: 110 }}
            />
        </Space.Compact>
    );
};

const fieldOpts = (availableFields, current) => {
    const opts = (availableFields || []).map((f) => ({
        value: f.name,
        label: <span><span style={{ fontFamily: 'monospace' }}>{f.name}</span> <Text type="secondary" style={{ fontSize: 11 }}>{f.type}</Text></span>,
    }));
    if (current && !opts.find((o) => o.value === current)) {
        opts.unshift({ value: current, label: current });
    }
    return opts;
};

const PrimitiveEditor = ({ value, onChange, availableFields, schema, table }) => {
    const set = (patch) => onChange({ ...value, ...patch });
    const op = value.operation || 'count';
    return (
        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
            <Select
                size="small"
                value={op}
                options={PRIMITIVE_OPS}
                onChange={(v) => set({ operation: v })}
                style={{ width: '100%' }}
            />
            {!OPS_WITHOUT_FIELD.has(op) && (
                <Select
                    size="small"
                    value={value.field || undefined}
                    onChange={(v) => set({ field: v })}
                    options={fieldOpts(availableFields, value.field)}
                    placeholder="Columna"
                    showSearch
                    allowClear
                    style={{ width: '100%' }}
                />
            )}
            {op === 'count_where' && (
                <Space.Compact style={{ width: '100%' }}>
                    <Select
                        size="small"
                        value={value.where_field || undefined}
                        onChange={(v) => set({ where_field: v })}
                        options={fieldOpts(availableFields, value.where_field)}
                        placeholder="Columna filtro"
                        showSearch
                        allowClear
                        style={{ flex: 1 }}
                    />
                    <Input
                        size="small"
                        value={value.where_value ?? ''}
                        onChange={(e) => set({ where_value: e.target.value })}
                        placeholder="Valor exacto"
                    />
                </Space.Compact>
            )}
            {op === 'latest' && (
                <Select
                    size="small"
                    value={value.order_field || undefined}
                    onChange={(v) => set({ order_field: v })}
                    options={fieldOpts(availableFields, value.order_field)}
                    placeholder="Columna ordenadora (DESC)"
                    showSearch
                    allowClear
                    style={{ width: '100%' }}
                />
            )}
            <StatsFiltersEditor
                value={value.filters}
                onChange={(filters) => set({ filters })}
                availableFields={availableFields}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
                Tabla: <code>{schema}.{table}</code>
            </Text>
        </Space>
    );
};

const ExpressionEditor = ({ value, onChange, availableFields, schema, table, depth = 0 }) => {
    const isLiteral = value && Object.prototype.hasOwnProperty.call(value, 'literal');
    const isPrimitive = value && value.operation && PRIMITIVE_OPS.find((o) => o.value === value.operation);
    const isCombinator = value && value.op;

    const kind = isLiteral ? 'literal' : (isPrimitive ? 'primitive' : (isCombinator ? 'combinator' : 'primitive'));
    const canNest = depth < MAX_EXPRESSION_DEPTH - 1;

    const setKind = (newKind) => {
        if (newKind === 'literal') {
            onChange({ literal: 0 });
        } else if (newKind === 'primitive') {
            onChange({ operation: 'count', schema, table });
        } else if (newKind === 'combinator') {
            onChange({
                op: 'percent',
                left: { operation: 'sum', schema, table, field: '' },
                right: { operation: 'sum', schema, table, field: '' },
            });
        }
    };

    return (
        <div style={{
            border: '1px dashed #d9d9d9',
            borderRadius: 6,
            padding: 8,
            background: depth % 2 === 0 ? '#fafafa' : '#fff',
        }}>
            <Radio.Group
                size="small"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                optionType="button"
                style={{ marginBottom: 8 }}
                options={[
                    { value: 'primitive', label: 'Operación' },
                    { value: 'combinator', label: 'Combinar', disabled: !canNest },
                    { value: 'literal', label: 'Literal' },
                ]}
            />
            {!canNest && (
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                    Nivel máximo de anidamiento alcanzado ({MAX_EXPRESSION_DEPTH}).
                </Text>
            )}
            {kind === 'literal' && (
                <InputNumber
                    size="small"
                    value={value.literal}
                    onChange={(v) => onChange({ literal: v ?? 0 })}
                    style={{ width: '100%' }}
                />
            )}
            {kind === 'primitive' && (
                <PrimitiveEditor
                    value={value.operation ? value : { operation: 'count', schema, table }}
                    onChange={(v) => onChange({ ...v, schema, table })}
                    availableFields={availableFields}
                    schema={schema}
                    table={table}
                />
            )}
            {kind === 'combinator' && (
                <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                    <Select
                        size="small"
                        value={value.op || 'percent'}
                        options={COMBINATOR_OPS}
                        onChange={(v) => onChange({ ...value, op: v })}
                        style={{ width: '100%' }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Izquierda (a):</Text>
                    <ExpressionEditor
                        value={value.left || { operation: 'count', schema, table }}
                        onChange={(v) => onChange({ ...value, left: v })}
                        availableFields={availableFields}
                        schema={schema}
                        table={table}
                        depth={depth + 1}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Derecha (b):</Text>
                    <ExpressionEditor
                        value={value.right || { operation: 'count', schema, table }}
                        onChange={(v) => onChange({ ...value, right: v })}
                        availableFields={availableFields}
                        schema={schema}
                        table={table}
                        depth={depth + 1}
                    />
                </Space>
            )}
        </div>
    );
};

const resumenDe = (slot) => {
    if (slot.operation === 'static') return 'valor fijo';
    if (slot.operation === 'formula') {
        const op = slot.expression?.op;
        return `fórmula · ${(COMBINATOR_OPS.find((o) => o.value === op)?.label || op || '—')}`;
    }
    const campo = slot.field ? `(${slot.field})` : '';
    return `${slot.operation}${campo}`;
};

const StatSlot = ({ slot, onChange, onRemove, availableFields, schema, table }) => {

    const set = (patch) => onChange({ ...slot, ...patch });

    const mode = slot.operation === 'static' ? 'static' : (slot.operation === 'formula' ? 'formula' : 'primitive');
    const setMode = (newMode) => {
        if (newMode === 'static') {
            onChange({ position: slot.position, operation: 'static', value: slot.value ?? '', label: slot.label || '', symbol: slot.symbol || '', format: slot.format || '' });
        } else if (newMode === 'primitive') {
            onChange({ position: slot.position, operation: 'count', schema, table, label: slot.label || '', symbol: slot.symbol || '', format: slot.format || '' });
        } else {
            onChange({
                position: slot.position,
                operation: 'formula',
                expression: { op: 'percent', left: { operation: 'sum', schema, table, field: '' }, right: { operation: 'sum', schema, table, field: '' } },
                label: slot.label || '',
                symbol: slot.symbol || '',
                format: slot.format || '',
            });
        }
    };


    const baseInputs = (
        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
            <Space.Compact style={{ width: '100%' }}>
                <Input
                    size="small"
                    addonBefore="Nombre"
                    value={slot.label || ''}
                    onChange={(e) => set({ label: e.target.value })}
                    placeholder="Ej. Población total"
                />
                <Input
                    size="small"
                    addonBefore="Símbolo"
                    value={slot.symbol || ''}
                    onChange={(e) => set({ symbol: e.target.value })}
                    placeholder="%, ha, MXN…"
                    style={{ width: 180 }}
                />
            </Space.Compact>
            <Select
                size="small"
                value={slot.format || ''}
                onChange={(v) => set({ format: v || undefined })}
                options={FORMATS}
                style={{ width: '100%' }}
                placeholder="Formato"
            />
        </Space>
    );

    return (
        <div className="stats-editor">
            <div className="stats-editor-head">
                <span className="stats-editor-title">
                    {slot.label || `Indicador ${slot.position}`}
                    <span className="stats-editor-tec">{resumenDe(slot)}</span>
                </span>
                <Tooltip title="Quitar indicador">
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onRemove} />
                </Tooltip>
            </div>
            <Space orientation="vertical" size="middle" className="stats-editor-body" style={{ width: '100%' }}>
                <Radio.Group
                    size="small"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    optionType="button"
                    options={[
                        { value: 'static', label: 'Estático' },
                        { value: 'primitive', label: labelWithBeta('Operación') },
                        { value: 'formula', label: labelWithBeta('Fórmula') },
                    ]}
                />
                {baseInputs}

                {mode === 'static' && (
                    <Input
                        size="small"
                        addonBefore="Valor"
                        value={slot.value ?? ''}
                        onChange={(e) => set({ value: e.target.value })}
                        placeholder="Valor literal a mostrar"
                    />
                )}
                {mode === 'primitive' && (
                    <PrimitiveEditor
                        value={slot}
                        onChange={(v) => set({ ...v, schema, table })}
                        availableFields={availableFields}
                        schema={schema}
                        table={table}
                    />
                )}
                {mode === 'formula' && (
                    <ExpressionEditor
                        value={slot.expression || { op: 'percent', left: { operation: 'sum', schema, table, field: '' }, right: { operation: 'sum', schema, table, field: '' } }}
                        onChange={(v) => set({ expression: v })}
                        availableFields={availableFields}
                        schema={schema}
                        table={table}
                    />
                )}

            </Space>
        </div>
    );
};

export default function LayerStatsSection({
    layerKey,
    workspace,
    geoserverLayer,
    availableFields = [],
    onDraftSaved,
}) {
    const {
        getLayerStats,
        saveStatsDraft,
        previewLayerStat,
        listMunicipios,
    } = useLayerTreeAdmin();

    const [loading, setLoading] = useState(true);
    const [previewContext, setPreviewContext] = useState({ municipio: [], fechaInicio: null, fechaFin: null });
    const [slotAbierto, setSlotAbierto] = useState(null);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState(null);
    const [pieNumeralia, setPieNumeralia] = useState('');
    const [ttlMinutes, setTtlMinutes] = useState(1440);
    const [config, setConfig] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [liveValues, setLiveValues] = useState({});
    const [contextoAbierto, setContextoAbierto] = useState(false);
    const [ttlAbierto, setTtlAbierto] = useState(false);
    const [editandoPie, setEditandoPie] = useState(false);

    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';

    const schema = workspace || '';
    const table = geoserverLayer || '';

    const reload = useCallback(async () => {
        if (!layerKey) return;
        setLoading(true);
        try {
            const data = await getLayerStats(layerKey);
            if (data) {
                setStats(data);
                const cfg = Array.isArray(data.statsConfig) ? data.statsConfig : (Array.isArray(data.stats_config) ? data.stats_config : []);
                const vals = Array.isArray(data.values) ? data.values : [];
                if (cfg.length === 0 && vals.length > 0) {
                    const seen = new Set();
                    const autoSlots = vals
                        .map((v) => ({
                            position: Number(v.posicion) || null,
                            operation: 'static',
                            value: v.valor ?? '',
                            label: v.nombre || '',
                            symbol: v.simbolo || '',
                            format: '',
                            _autoFromLegacy: true,
                        }))
                        .filter((s) => {
                            if (!s.position || s.position < 1 || s.position > 8) return false;
                            if (seen.has(s.position)) return false;
                            seen.add(s.position);
                            return true;
                        });
                    setConfig(autoSlots);
                } else {
                    setConfig(cfg);
                }
                setDirty(false);
                setPieNumeralia(data.pieNumeralia ?? data.pie_numeralia ?? '');
                setTtlMinutes(data.ttlMinutes ?? data.ttl_minutes ?? 1440);
            } else {
                setStats(null);
                setConfig([]);
            }
        } catch {
            message.error('Error cargando estadísticas');
        } finally {
            setLoading(false);
        }
    }, [layerKey, getLayerStats]);

    useEffect(() => { reload(); }, [reload]);

    const usedPositions = useMemo(() => new Set(config.map((c) => c.position).filter(Boolean)), [config]);
    const nextPosition = () => {
        for (let i = 1; i <= 8; i++) if (!usedPositions.has(i)) return i;
        return null;
    };

    const applyConfig = (next) => {
        setConfig(next);
        setDirty(true);
    };

    const addSlot = (mode) => {
        const pos = nextPosition();
        if (!pos) {
            message.warning('Máximo 8 slots');
            return;
        }
        const base = { position: pos, label: '', symbol: '', format: '' };
        if (mode === 'static') {
            applyConfig([...config, { ...base, operation: 'static', value: '' }]);
        } else if (mode === 'primitive') {
            applyConfig([...config, { ...base, operation: 'count', schema, table }]);
        } else {
            applyConfig([...config, {
                ...base,
                operation: 'formula',
                expression: { op: 'percent', left: { operation: 'sum', schema, table, field: '' }, right: { operation: 'sum', schema, table, field: '' } },
            }]);
        }
    };

    const updateSlot = (idx, next) => {
        applyConfig(config.map((c, i) => (i === idx ? next : c)));
    };

    const removeSlot = (idx) => applyConfig(config.filter((_, i) => i !== idx));

    const normalizePieNumeralia = (text) => {
        const trimmed = (text || '').trim();
        if (!trimmed) return null;
        return trimmed.startsWith('*') ? trimmed : `* ${trimmed}`;
    };

    const autoguardar = useCallback(async (siguiente, pie, ttl) => {
        setSaving(true);
        try {
            await saveStatsDraft(layerKey, {
                stats_config: siguiente,
                pie_numeralia: normalizePieNumeralia(pie),
                ttl_minutes: ttl,
            });
            setDirty(false);
            onDraftSaved?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo guardar el borrador de la numeralia');
        } finally {
            setSaving(false);
        }
    }, [layerKey, saveStatsDraft, onDraftSaved]);

    useEffect(() => {
        if (!dirty) return undefined;
        const t = setTimeout(() => autoguardar(config, pieNumeralia, ttlMinutes), 1500);
        return () => clearTimeout(t);
    }, [dirty, config, pieNumeralia, ttlMinutes, isAdmin, autoguardar]);

    useEffect(() => {
        if (config.length === 0) { setLiveValues({}); return undefined; }
        let cancelado = false;
        const t = setTimeout(async () => {
            const entradas = await Promise.all(config.map(async (slot) => {
                if (slot.operation === 'static') return [slot.position, slot.value ?? null];
                try {
                    const res = await previewLayerStat(layerKey, slot, previewContext);
                    return [slot.position, res?.value ?? null];
                } catch {
                    return [slot.position, undefined];
                }
            }));
            if (!cancelado) setLiveValues(Object.fromEntries(entradas));
        }, 800);
        return () => { cancelado = true; clearTimeout(t); };
    }, [config, previewContext, layerKey, previewLayerStat]);

    if (loading) return <Spin style={{ display: 'block', margin: '24px auto' }} />;

    const seleccionado = slotAbierto !== null ? config[slotAbierto] : null;
    const refreshedAt = stats?.valuesRefreshedAt || stats?.values_refreshed_at;
    const refreshErrors = Array.isArray(stats?.errors) ? stats.errors : [];

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <StatsPreviewGrid
                config={config}
                values={stats?.values}
                liveValues={liveValues}
                selectedIndex={slotAbierto}
                onSelect={(i2) => setSlotAbierto((prev) => (prev === i2 ? null : i2))}
                onAdd={() => { addSlot('static'); setSlotAbierto(config.length); }}
                canAdd={config.length < 8 && isAdmin}
                pie={pieNumeralia}
                editandoPie={editandoPie}
                onPieClick={() => isAdmin && setEditandoPie(true)}
                onPieChange={(v) => { setPieNumeralia(v); setDirty(true); }}
                onPieBlur={() => setEditandoPie(false)}
                saving={saving}
                actions={(
                    <>
                        <Tooltip title="Simula el municipio y el rango de fechas que manda el visor, para ver cómo cambian los valores">
                            <Button
                                size="small"
                                className="stats-preview-action"
                                icon={<ThunderboltOutlined />}
                                onClick={() => setContextoAbierto(true)}
                            >
                                <span className="stats-preview-action-label">Probar con contexto</span>
                            </Button>
                        </Tooltip>
                        <Tooltip title="Cuánto tiempo se dan por buenos los valores antes de volver a calcularlos">
                            <Button
                                size="small"
                                className="stats-preview-action"
                                icon={<ClockCircleOutlined />}
                                onClick={() => setTtlAbierto(true)}
                            >
                                <span className="stats-preview-action-label">Vigencia</span>
                            </Button>
                        </Tooltip>
                    </>
                )}
            />

            {refreshErrors.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    title="Algunos indicadores no pudieron calcularse"
                    description={
                        <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                            {refreshErrors.map((e, k) => (
                                <Text key={k} style={{ fontSize: 12 }}>
                                    <b>#{e.position ?? '—'}</b> {e.label ? `(${e.label})` : ''} — {e.error}
                                </Text>
                            ))}
                        </Space>
                    }
                />
            )}

            {config.length === 0 && stats?.values?.length > 0 && (
                <Tooltip title="Esta capa traía valores guardados sin configuración, del Sheet original. Se precargan como indicadores estáticos editables: conviértelos a operación dinámica si aplica.">
                    <Tag color="orange" style={{ cursor: 'help', alignSelf: 'flex-start' }}>Sin config — valores legacy</Tag>
                </Tooltip>
            )}

            {seleccionado ? (
                <StatSlot
                    slot={seleccionado}
                    onChange={(next) => updateSlot(slotAbierto, next)}
                    onRemove={() => { removeSlot(slotAbierto); setSlotAbierto(null); }}
                    availableFields={availableFields}
                    schema={schema}
                    table={table}
                />
            ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Da click en un recuadro para editarlo.
                </Text>
            )}

            {refreshedAt && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                    Última actualización: {new Date(refreshedAt).toLocaleString()}
                </Text>
            )}

            <Modal
                open={contextoAbierto}
                onCancel={() => setContextoAbierto(false)}
                title="Probar con contexto"
                footer={[<Button key="c" onClick={() => setContextoAbierto(false)}>Cerrar</Button>]}
            >
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                    Simula el municipio y el rango de fechas que el visor manda. La vista previa se
                    recalcula al cambiarlos.
                </Text>
                <StatsPreviewContext
                    value={previewContext}
                    onChange={setPreviewContext}
                    listMunicipios={listMunicipios}
                />
            </Modal>

            <Modal
                open={ttlAbierto}
                onCancel={() => setTtlAbierto(false)}
                title="Vigencia del cálculo"
                footer={[<Button key="c" onClick={() => setTtlAbierto(false)}>Cerrar</Button>]}
            >
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                    Cuánto tiempo se dan por buenos los valores antes de volver a calcularlos.
                </Text>
                <TtlInput
                    value={ttlMinutes}
                    onChange={(v) => { setTtlMinutes(v); setDirty(true); }}
                />
            </Modal>
        </Space>
    );
}
