import { useCallback, useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, Input, Radio, Select, Space, Spin, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';

const { Text } = Typography;

const OPERATORS = [
    { value: '=', label: '=' },
    { value: '<>', label: '≠' },
    { value: '<', label: '<' },
    { value: '>', label: '>' },
    { value: '<=', label: '≤' },
    { value: '>=', label: '≥' },
    { value: 'LIKE', label: 'contiene (LIKE)' },
    { value: 'ILIKE', label: 'contiene insensible (ILIKE)' },
    { value: 'IN', label: 'en lista (IN)' },
    { value: 'NOT IN', label: 'fuera de lista (NOT IN)' },
    { value: 'IS NULL', label: 'es nulo' },
    { value: 'IS NOT NULL', label: 'no es nulo' },
];

const NO_VALUE_OPS = new Set(['IS NULL', 'IS NOT NULL']);
const LIST_OPS = new Set(['IN', 'NOT IN']);

const isNumericType = (t) => t === 'integer' || t === 'number' || t === 'long' || t === 'double' || t === 'float';

const escapeStringValue = (s) => String(s).replace(/'/g, "''");

const formatScalar = (raw, type) => {
    if (raw === null || raw === undefined) return "''";
    const str = String(raw).trim();
    if (str === '') return "''";
    if (isNumericType(type) && /^-?\d+(\.\d+)?$/.test(str)) return str;
    if (type === 'boolean' && /^(true|false)$/i.test(str)) return str.toLowerCase();
    return `'${escapeStringValue(str)}'`;
};

const formatList = (raw, type) => {
    const items = String(raw || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    if (!items.length) return '()';
    return `(${items.map((v) => formatScalar(v, type)).join(', ')})`;
};

const formatCondition = (cond, fieldsByName) => {
    const f = fieldsByName[cond.field];
    const type = f?.type;
    const fieldRef = `"${cond.field}"`;
    if (NO_VALUE_OPS.has(cond.op)) return `${fieldRef} ${cond.op}`;
    if (LIST_OPS.has(cond.op)) return `${fieldRef} ${cond.op} ${formatList(cond.value, type)}`;
    return `${fieldRef} ${cond.op} ${formatScalar(cond.value, type)}`;
};

const buildCql = ({ combinator, conditions }, fieldsByName) => {
    const valid = conditions.filter((c) => c.field && c.op);
    if (!valid.length) return '';
    return valid.map((c) => formatCondition(c, fieldsByName)).join(` ${combinator} `);
};

const TOKEN_RE = /^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+(IS NOT NULL|IS NULL|NOT IN|IN|LIKE|ILIKE|<>|<=|>=|=|<|>)(?:\s+(.+))?$/i;

const parseValueToken = (raw) => {
    if (raw === undefined || raw === null) return '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        const inner = trimmed.slice(1, -1);
        return inner
            .split(/,(?=(?:[^']*'[^']*')*[^']*$)/)
            .map((p) => {
                const x = p.trim();
                if (x.startsWith("'") && x.endsWith("'")) return x.slice(1, -1).replace(/''/g, "'");
                return x;
            })
            .join(', ');
    }
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        return trimmed.slice(1, -1).replace(/''/g, "'");
    }
    return trimmed;
};

const splitTopLevelByConnector = (text, connector) => {
    const re = new RegExp(`\\s+${connector}\\s+`, 'gi');
    const parts = [];
    let depth = 0;
    let inStr = false;
    let last = 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === "'") inStr = !inStr;
        else if (!inStr && ch === '(') depth++;
        else if (!inStr && ch === ')') depth--;
    }
    if (depth !== 0) return null;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
        const idx = m.index;
        const before = text.slice(0, idx);
        let d = 0;
        let s = false;
        for (let i = 0; i < before.length; i++) {
            if (before[i] === "'") s = !s;
            else if (!s && before[i] === '(') d++;
            else if (!s && before[i] === ')') d--;
        }
        if (d === 0 && !s) {
            parts.push(text.slice(last, idx).trim());
            last = idx + m[0].length;
        }
    }
    parts.push(text.slice(last).trim());
    return parts;
};

const tryParseCql = (text) => {
    const t = (text || '').trim();
    if (!t) return { combinator: 'AND', conditions: [] };
    let parts = splitTopLevelByConnector(t, 'AND');
    let combinator = 'AND';
    if (!parts || parts.length === 1) {
        const orParts = splitTopLevelByConnector(t, 'OR');
        if (orParts && orParts.length > 1) {
            parts = orParts;
            combinator = 'OR';
        }
    }
    if (!parts) return null;
    const conditions = [];
    for (const part of parts) {
        const m = TOKEN_RE.exec(part.trim());
        if (!m) return null;
        const [, field, opRaw, valueRaw] = m;
        const op = opRaw.toUpperCase();
        conditions.push({ field, op, value: NO_VALUE_OPS.has(op) ? '' : parseValueToken(valueRaw) });
    }
    return { combinator, conditions };
};

export default function CqlFilterBuilder({
    value,
    onChange,
    workspaceAlias,
    geoserverLayer,
    listFields,
}) {
    const [mode, setMode] = useState('builder');
    const [fields, setFields] = useState([]);
    const [samples, setSamples] = useState({});
    const [loading, setLoading] = useState(false);
    const [combinator, setCombinator] = useState('AND');
    const [conditions, setConditions] = useState([]);
    const [rawValue, setRawValue] = useState(value || '');
    const [parseFailed, setParseFailed] = useState(false);

    const fieldsByName = useMemo(() => {
        const map = {};
        for (const f of fields) map[f.name] = f;
        return map;
    }, [fields]);

    useEffect(() => {
        setRawValue(value || '');
        const parsed = tryParseCql(value);
        if (parsed) {
            setCombinator(parsed.combinator);
            setConditions(parsed.conditions);
            setParseFailed(false);
        } else {
            setParseFailed(true);
            setMode('raw');
        }
    }, [value]);

    useEffect(() => {
        if (!workspaceAlias || !geoserverLayer || !listFields) {
            setFields([]);
            setSamples({});
            return;
        }
        let cancelled = false;
        setLoading(true);
        listFields(workspaceAlias, geoserverLayer, { includeSamples: true })
            .then((data) => {
                if (cancelled) return;
                setFields(data?.fields || []);
                setSamples(data?.sampleValues || {});
            })
            .catch(() => { if (!cancelled) { setFields([]); setSamples({}); } })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [workspaceAlias, geoserverLayer, listFields]);

    const emit = useCallback((next) => {
        const cql = buildCql(next, fieldsByName);
        setRawValue(cql);
        onChange?.(cql);
    }, [fieldsByName, onChange]);

    const updateCondition = (idx, patch) => {
        const next = conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c));
        setConditions(next);
        emit({ combinator, conditions: next });
    };

    const removeCondition = (idx) => {
        const next = conditions.filter((_, i) => i !== idx);
        setConditions(next);
        emit({ combinator, conditions: next });
    };

    const addCondition = () => {
        const next = [...conditions, { field: fields[0]?.name || '', op: '=', value: '' }];
        setConditions(next);
        emit({ combinator, conditions: next });
    };

    const changeCombinator = (newCombinator) => {
        setCombinator(newCombinator);
        emit({ combinator: newCombinator, conditions });
    };

    const handleRawChange = (e) => {
        const next = e.target.value;
        setRawValue(next);
        onChange?.(next);
        const parsed = tryParseCql(next);
        if (parsed) {
            setCombinator(parsed.combinator);
            setConditions(parsed.conditions);
            setParseFailed(false);
        } else {
            setParseFailed(true);
        }
    };

    const switchMode = (newMode) => {
        if (newMode === 'builder' && parseFailed) {
            message.warning('No se puede mostrar este CQL en el constructor; quédate en texto avanzado.');
            return;
        }
        setMode(newMode);
    };

    const insertFieldToken = (fieldName) => {
        const token = `"${fieldName}"`;
        const next = rawValue ? `${rawValue.replace(/\s+$/, '')} ${token}` : token;
        setRawValue(next);
        onChange?.(next);
        const parsed = tryParseCql(next);
        if (parsed) {
            setCombinator(parsed.combinator);
            setConditions(parsed.conditions);
            setParseFailed(false);
        } else {
            setParseFailed(true);
        }
    };

    const fieldOptions = fields.map((f) => ({
        value: f.name,
        label: `${f.name} (${f.type})`,
    }));

    const renderValueInput = (cond, idx) => {
        if (NO_VALUE_OPS.has(cond.op)) {
            return <Input value="—" disabled style={{ width: '100%' }} />;
        }
        const fieldType = fieldsByName[cond.field]?.type;
        const fieldSamples = samples[cond.field] || [];
        if (LIST_OPS.has(cond.op)) {
            return (
                <Input
                    placeholder="Valores separados por coma"
                    value={cond.value}
                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                />
            );
        }
        if (fieldSamples.length) {
            return (
                <AutoComplete
                    style={{ width: '100%' }}
                    value={cond.value}
                    options={fieldSamples.map((v) => ({ value: String(v) }))}
                    onChange={(v) => updateCondition(idx, { value: v })}
                    placeholder={isNumericType(fieldType) ? 'Número' : 'Texto'}
                    filterOption={(input, option) =>
                        option.value.toLowerCase().includes(input.toLowerCase())
                    }
                />
            );
        }
        return (
            <Input
                placeholder={isNumericType(fieldType) ? 'Número' : 'Texto'}
                value={cond.value}
                onChange={(e) => updateCondition(idx, { value: e.target.value })}
            />
        );
    };

    return (
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Space size="small">
                <Radio.Group
                    size="small"
                    value={mode}
                    onChange={(e) => switchMode(e.target.value)}
                    optionType="button"
                    options={[
                        { label: 'Constructor', value: 'builder' },
                        { label: 'Texto avanzado', value: 'raw' },
                    ]}
                />
                {!workspaceAlias || !geoserverLayer ? (
                    <Text type="secondary">Selecciona workspace y capa primero.</Text>
                ) : loading ? (
                    <Spin size="small" />
                ) : (
                    <Tag color="blue">{fields.length} columnas disponibles</Tag>
                )}
                {parseFailed && mode === 'raw' && (
                    <Tag color="orange">CQL no parseable al constructor</Tag>
                )}
            </Space>

            {mode === 'builder' ? (
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    {conditions.length > 1 && (
                        <Space size="small">
                            <Text type="secondary">Combinar con:</Text>
                            <Radio.Group
                                size="small"
                                value={combinator}
                                onChange={(e) => changeCombinator(e.target.value)}
                                optionType="button"
                                options={[
                                    { label: 'AND (todas)', value: 'AND' },
                                    { label: 'OR (cualquiera)', value: 'OR' },
                                ]}
                            />
                        </Space>
                    )}
                    {conditions.map((cond, idx) => (
                        <Space.Compact key={idx} style={{ width: '100%' }}>
                            <Select
                                showSearch
                                style={{ width: 220 }}
                                placeholder="Campo"
                                value={cond.field || undefined}
                                options={fieldOptions}
                                onChange={(v) => updateCondition(idx, { field: v })}
                                filterOption={(input, option) =>
                                    option.value.toLowerCase().includes(input.toLowerCase())
                                }
                            />
                            <Select
                                style={{ width: 180 }}
                                value={cond.op}
                                options={OPERATORS}
                                onChange={(v) => updateCondition(idx, { op: v, value: NO_VALUE_OPS.has(v) ? '' : cond.value })}
                            />
                            <div style={{ flex: 1 }}>{renderValueInput(cond, idx)}</div>
                            <Button danger icon={<DeleteOutlined />} onClick={() => removeCondition(idx)} />
                        </Space.Compact>
                    ))}
                    <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={addCondition}
                        disabled={!fields.length}
                        block
                    >
                        Agregar condición
                    </Button>
                    {rawValue && (
                        <div style={{
                            padding: '6px 10px',
                            background: '#fafafa',
                            border: '1px solid #f0f0f0',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            wordBreak: 'break-all',
                        }}>
                            <Text type="secondary" style={{ fontFamily: 'system-ui', marginRight: 6 }}>
                                CQL generado:
                            </Text>
                            {rawValue}
                        </div>
                    )}
                </Space>
            ) : (
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    {fields.length > 0 && (
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Campos disponibles (click para insertar al final):
                            </Text>
                            <div style={{ marginTop: 4 }}>
                                {fields.map((f) => (
                                    <Tag
                                        key={f.name}
                                        style={{ cursor: 'pointer', marginBottom: 4 }}
                                        onClick={() => insertFieldToken(f.name)}
                                    >
                                        <span style={{ fontFamily: 'monospace' }}>{f.name}</span>
                                        <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                                            {f.type}
                                        </Text>
                                    </Tag>
                                ))}
                            </div>
                        </div>
                    )}
                    <Input.TextArea
                        autoSize={{ minRows: 3, maxRows: 10 }}
                        style={{ fontFamily: 'monospace' }}
                        placeholder="modalidad = 'Con violencia' AND año >= 2020"
                        value={rawValue}
                        onChange={handleRawChange}
                    />
                </Space>
            )}
        </Space>
    );
}
