import { Button, DatePicker, Input, Select, Space, Tooltip, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

export const MAX_FILTERS = 6;

const FILTER_OPS = [
    { value: 'eq', label: '= igual a' },
    { value: 'in', label: 'en la lista' },
    { value: 'gte', label: '≥ desde' },
    { value: 'lte', label: '≤ hasta' },
    { value: 'between', label: 'entre (rango)' },
    { value: 'is_not_null', label: 'tiene dato' },
];

const CONTEXT_VALUES = [
    { value: '{{municipio}}', label: 'Municipio seleccionado en el visor' },
    { value: '{{fecha.inicio}}', label: 'Fecha inicial del visor' },
    { value: '{{fecha.fin}}', label: 'Fecha final del visor' },
];

const MUNICIPIO_TOKEN = '@municipio';

const isContextValue = (value) => typeof value === 'string' && /^\{\{[a-z_.]+\}\}$/.test(value.trim());

const fieldOptions = (availableFields, current) => {
    const opts = (availableFields || []).map((f) => ({ value: f, label: f }));
    if (current && !opts.some((o) => o.value === current)) opts.unshift({ value: current, label: current });
    if (!opts.some((o) => o.value === MUNICIPIO_TOKEN)) {
        opts.unshift({ value: MUNICIPIO_TOKEN, label: '@municipio — la columna que declare la capa' });
    }
    return opts;
};

const ValueInput = ({ filter, onChange }) => {
    const { op, value } = filter;

    if (op === 'is_not_null') return <Text type="secondary" style={{ fontSize: 12 }}>sin valor</Text>;

    if (op === 'between') {
        const [from, to] = Array.isArray(value) ? value : ['', ''];
        if (isContextValue(from) || isContextValue(to)) {
            return (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    rango del visor ({from} … {to})
                </Text>
            );
        }
        return (
            <DatePicker.RangePicker
                size="small"
                style={{ width: '100%' }}
                value={from && to ? [dayjs(from), dayjs(to)] : null}
                onChange={(dates) => onChange({
                    value: dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : ['', ''],
                })}
            />
        );
    }

    if (isContextValue(value)) {
        return (
            <Select
                size="small"
                style={{ width: '100%' }}
                value={value}
                options={CONTEXT_VALUES}
                onChange={(v) => onChange({ value: v })}
            />
        );
    }

    if (op === 'in') {
        return (
            <Select
                size="small"
                mode="tags"
                style={{ width: '100%' }}
                placeholder="Valores; Enter entre cada uno"
                value={Array.isArray(value) ? value : []}
                onChange={(v) => onChange({ value: v })}
            />
        );
    }

    return (
        <Input
            size="small"
            placeholder="Valor"
            value={value ?? ''}
            onChange={(e) => onChange({ value: e.target.value })}
        />
    );
};

const defaultValueFor = (op) => {
    if (op === 'is_not_null') return null;
    if (op === 'between') return ['{{fecha.inicio}}', '{{fecha.fin}}'];
    if (op === 'in') return [];
    return '';
};

const FilterRow = ({ filter, availableFields, onChange, onRemove }) => {
    const set = (patch) => onChange({ ...filter, ...patch });
    const usesContext = isContextValue(filter.value)
        || (Array.isArray(filter.value) && filter.value.some(isContextValue));

    return (
        <Space.Compact style={{ width: '100%' }}>
            <Select
                size="small"
                style={{ width: '34%' }}
                value={filter.field || undefined}
                options={fieldOptions(availableFields, filter.field)}
                onChange={(v) => set({ field: v })}
                placeholder="Columna"
                showSearch
            />
            <Select
                size="small"
                style={{ width: '24%' }}
                value={filter.op}
                options={FILTER_OPS}
                onChange={(v) => set({ op: v, value: defaultValueFor(v) })}
            />
            <div style={{ width: '34%' }}>
                <ValueInput filter={filter} onChange={set} />
            </div>
            <Tooltip title={usesContext ? 'Se omite si el visor no manda ese dato' : 'Valor fijo'}>
                <Button
                    size="small"
                    type={usesContext ? 'primary' : 'default'}
                    ghost={usesContext}
                    onClick={() => set({
                        value: usesContext ? '' : (filter.op === 'in' ? '{{municipio}}' : '{{fecha.inicio}}'),
                    })}
                >
                    {usesContext ? 'visor' : 'fijo'}
                </Button>
            </Tooltip>
            <Button size="small" icon={<DeleteOutlined />} onClick={onRemove} danger />
        </Space.Compact>
    );
};

const StatsFiltersEditor = ({ value, onChange, availableFields }) => {
    const filters = value || [];

    const update = (index, next) => onChange(filters.map((f, i) => (i === index ? next : f)));
    const remove = (index) => onChange(filters.filter((_, i) => i !== index));
    const add = () => onChange([...filters, { field: '', op: 'eq', value: '' }]);

    return (
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            {filters.map((filter, index) => (
                <FilterRow
                    key={index}
                    filter={filter}
                    availableFields={availableFields}
                    onChange={(next) => update(index, next)}
                    onRemove={() => remove(index)}
                />
            ))}
            <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={add}
                disabled={filters.length >= MAX_FILTERS}
                style={{ width: '100%' }}
            >
                {filters.length >= MAX_FILTERS ? `Máximo ${MAX_FILTERS} condiciones` : 'Agregar condición'}
            </Button>
        </Space>
    );
};

export default StatsFiltersEditor;
