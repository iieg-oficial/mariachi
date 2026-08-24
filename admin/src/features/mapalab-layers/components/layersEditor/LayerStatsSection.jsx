import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Input, InputNumber, Radio, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import {
    CalculatorOutlined,
    DeleteOutlined,
    PlusOutlined,
    ReloadOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import StatusBadge from '@shared/components/StatusBadge';
import StatsFiltersEditor from './StatsFiltersEditor';
import StatsPreviewContext from './StatsPreviewContext';

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

const StatSlot = ({ slot, onChange, onRemove, availableFields, schema, table, layerKey, previewLayerStat, previewContext }) => {
    const [previewValue, setPreviewValue] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [previewError, setPreviewError] = useState(null);

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
        setPreviewValue(null);
        setPreviewError(null);
    };

    const runPreview = async () => {
        setPreviewing(true);
        setPreviewError(null);
        try {
            const res = await previewLayerStat(layerKey, slot, previewContext);
            setPreviewValue(res.value);
        } catch (err) {
            setPreviewError(err?.response?.data?.detail || 'Error');
        } finally {
            setPreviewing(false);
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
        <Card
            size="small"
            title={
                <Space size={6}>
                    <Tag color="purple">#{slot.position}</Tag>
                    <Text strong>Slot {slot.position}</Text>
                </Space>
            }
            extra={
                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onRemove} />
            }
            styles={{ body: { paddingTop: 8 } }}
        >
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Radio.Group
                    size="small"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    optionType="button"
                    options={[
                        { value: 'static', label: 'Estático' },
                        { value: 'primitive', label: labelWithBeta('Operación simple') },
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

                <Space size={6} style={{ marginTop: 4 }}>
                    <Button
                        size="small"
                        icon={<ThunderboltOutlined />}
                        onClick={runPreview}
                        loading={previewing}
                        disabled={mode === 'primitive' && !schema}
                    >
                        Probar
                    </Button>
                    {previewValue !== null && previewValue !== undefined && (
                        <Tag color="green">
                            = {String(previewValue)}{slot.symbol ? ` ${slot.symbol}` : ''}
                        </Tag>
                    )}
                    {previewError && <Tag color="red">{previewError}</Tag>}
                </Space>
            </Space>
        </Card>
    );
};

export default function LayerStatsSection({
    layerKey,
    workspace,
    geoserverLayer,
    availableFields = [],
}) {
    const {
        getLayerStats,
        updateLayerStats,
        previewLayerStat,
        listMunicipios,
        refreshLayerStats,
    } = useLayerTreeAdmin();

    const [loading, setLoading] = useState(true);
    const [previewContext, setPreviewContext] = useState({ municipio: [], fechaInicio: null, fechaFin: null });
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState(null);
    const [pieNumeralia, setPieNumeralia] = useState('');
    const [ttlMinutes, setTtlMinutes] = useState(1440);
    const [config, setConfig] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [refreshErrors, setRefreshErrors] = useState([]);

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

    const handleSave = async () => {
        setSaving(true);
        try {
            const pieNormalized = normalizePieNumeralia(pieNumeralia);
            await updateLayerStats(layerKey, {
                stats_config: config,
                pie_numeralia: pieNormalized,
                ttl_minutes: ttlMinutes,
            });
            if (pieNormalized && pieNormalized !== pieNumeralia) {
                setPieNumeralia(pieNormalized);
            }
            message.success('Configuración de estadísticas guardada');
            reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setRefreshErrors([]);
        try {
            const res = await refreshLayerStats(layerKey);
            const failed = Array.isArray(res?.errors) ? res.errors : [];
            setRefreshErrors(failed);
            if (failed.length > 0) {
                message.warning(`Recalculado con ${failed.length} estadística(s) fallida(s)`);
            } else {
                message.success('Valores recalculados');
            }
            reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al refrescar');
        } finally {
            setRefreshing(false);
        }
    };

    if (loading) return <Spin style={{ display: 'block', margin: '24px auto' }} />;

    const refreshedAt = stats?.valuesRefreshedAt || stats?.values_refreshed_at;
    const savedConfig = stats?.statsConfig ?? stats?.stats_config ?? [];
    const savedConfigCount = Array.isArray(savedConfig) ? savedConfig.length : 0;
    const refreshDisabledReason = savedConfigCount === 0
        ? 'Guarda primero la configuración: el recálculo usa la configuración guardada en el servidor y borraría los valores actuales.'
        : (dirty ? 'Tienes cambios sin guardar. Guarda la configuración antes de recalcular.' : null);

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Alert closable
                type="info"
                showIcon
                message={
                    <span>
                        Hasta 8 slots de estadísticas (numeralia). Cada slot puede ser <b>Estático</b> (valor fijo),
                        <b> Operación simple</b> (count, sum, avg…) o <b>Fórmula</b> (combinaciones recursivas:
                        suma, resta, multiplicación, división, porcentaje y cambio porcentual).
                    </span>
                }
            />

            {!schema || !table ? (
                <Alert closable
                    type="warning"
                    showIcon
                    message="Para operaciones dinámicas se necesitan workspace y capa GeoServer definidos en la pestaña Servicios."
                />
            ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Tabla origen: <code>{schema}.{table}</code>
                </Text>
            )}

            <Space wrap size={6}>
                <Button size="small" icon={<PlusOutlined />} onClick={() => addSlot('static')}>
                    Slot estático
                </Button>
                <Button size="small" icon={<PlusOutlined />} onClick={() => addSlot('primitive')}>
                    Slot operación
                    <StatusBadge
                        variant="beta"
                        size="sm"
                        style={{
                            position: 'absolute',
                            top: -10,
                            right: 0,
                        }}
                    />
                </Button>
                <Button size="small" icon={<CalculatorOutlined />} onClick={() => addSlot('formula')}>
                    Slot fórmula
                    <StatusBadge
                        variant="beta"
                        size="sm"
                        style={{
                            position: 'absolute',
                            top: -10,
                            right: 0,
                        }}
                    />
                </Button>
            </Space>

            {config.length > 0 && (
                <Card size="small" title={labelWithBeta('Probar con contexto')} style={{ position: 'relative' }}>
                    <StatsPreviewContext
                        value={previewContext}
                        onChange={setPreviewContext}
                        listMunicipios={listMunicipios}
                    />
                </Card>
            )}

            {config.length === 0 ? (
                <Empty description="Sin slots. Agrega uno arriba." />
            ) : (
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    {config
                        .slice()
                        .sort((a, b) => (a.position || 0) - (b.position || 0))
                        .map((slot, idx) => {
                            const realIdx = config.indexOf(slot);
                            return (
                                <StatSlot
                                    key={`${slot.position}-${idx}`}
                                    slot={slot}
                                    onChange={(next) => updateSlot(realIdx, next)}
                                    onRemove={() => removeSlot(realIdx)}
                                    availableFields={availableFields}
                                    schema={schema}
                                    table={table}
                                    layerKey={layerKey}
                                    previewLayerStat={previewLayerStat}
                                    previewContext={previewContext}
                                />
                            );
                        })}
                </Space>
            )}

            <Card size="small" title="Pie de numeralia" styles={{ body: { paddingTop: 8 } }}>
                <Input.TextArea
                    rows={2}
                    value={pieNumeralia}
                    onChange={(e) => { setPieNumeralia(e.target.value); setDirty(true); }}
                    placeholder="Texto opcional al pie de las estadísticas (fuente, año, etc.)"
                />
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    Convención: el pie siempre empieza con asterisco (<code>*</code>). Si lo olvidas, mariachi lo prefija automáticamente al guardar.
                </Text>
            </Card>

            <Card size="small" title="Cache TTL (tiempo de vida del valor calculado)" styles={{ body: { paddingTop: 8 } }}>
                <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Tiempo que los valores calculados se consideran vigentes antes de recalcularse desde la BD.
                        Los valores estáticos no se ven afectados (no se recalculan). Para operaciones dinámicas:
                        si el TTL ya venció cuando el visor pide los stats, se vuelven a ejecutar las queries;
                        mientras esté vigente, sirve los valores cacheados.
                        Recomendado: 24h para datos que cambian poco; 1h para datos casi en vivo.
                    </Text>
                    <TtlInput value={ttlMinutes} onChange={(v) => { setTtlMinutes(v); setDirty(true); }} />
                    {refreshedAt && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Última actualización: {new Date(refreshedAt).toLocaleString()}
                        </Text>
                    )}
                </Space>
            </Card>

            {!isAdmin && (
                <Alert
                    type="warning"
                    showIcon
                    message="Solo una administradora puede guardar la configuración de estadísticas."
                    description="Puedes editarla y probarla aquí, pero el guardado está restringido."
                />
            )}

            <Space style={{ marginTop: 8 }}>
                <Tooltip title={isAdmin ? '' : 'Requiere rol de administradora'}>
                    <Button type="primary" loading={saving} onClick={handleSave} disabled={!isAdmin}>
                        Guardar configuración
                    </Button>
                </Tooltip>
                <Tooltip title={refreshDisabledReason || 'Ejecuta todas las operaciones contra la BD y persiste los valores'}>
                    <Button
                        icon={<ReloadOutlined />}
                        loading={refreshing}
                        onClick={handleRefresh}
                        disabled={Boolean(refreshDisabledReason)}
                    >
                        Recalcular valores ahora
                    </Button>
                </Tooltip>
            </Space>

            {refreshErrors.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    message="Algunas estadísticas no pudieron calcularse"
                    description={
                        <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                            {refreshErrors.map((e, i) => (
                                <Text key={i} style={{ fontSize: 12 }}>
                                    <b>#{e.position ?? '—'}</b> {e.label ? `(${e.label})` : ''} — {e.error}
                                </Text>
                            ))}
                        </Space>
                    }
                />
            )}

            {stats?.values?.length > 0 && (
                <Card
                    size="small"
                    title={
                        <Space size={6}>
                            <span>Valores actuales en el visor</span>
                            {config.length === 0 && (
                                <Tag color="orange">Sin config — valores legacy</Tag>
                            )}
                        </Space>
                    }
                    styles={{ body: { paddingTop: 8 } }}
                >
                    {config.some((c) => c._autoFromLegacy) && (
                        <Alert closable
                            type="info"
                            showIcon
                            style={{ marginBottom: 8 }}
                            message="Valores legacy precargados como slots estáticos"
                            description="Esta capa tenía valores guardados sin configuración (vienen del Sheet original). Los precarga­mos como slots estáticos editables. Edita los que quieras, convierte alguno a operación dinámica (count/sum/fórmula) si aplica, y guarda la configuración para que mariachi pase a ser la fuente única."
                        />
                    )}
                    <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                        {stats.values.map((v, i) => (
                            <Tag
                                key={i}
                                color="blue"
                                style={{
                                    whiteSpace: 'normal',
                                    height: 'auto',
                                    padding: '4px 8px',
                                    margin: 0,
                                    width: '100%',
                                }}
                            >
                                <Text strong>#{v.posicion}:</Text> {v.valor ?? '—'}{v.simbolo ? ` ${v.simbolo}` : ''}
                                {v.nombre && <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>{v.nombre}</Text>}
                            </Tag>
                        ))}
                    </Space>
                </Card>
            )}
        </Space>
    );
}
