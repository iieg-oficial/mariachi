import { Button, Input, Segmented, Select, Space, Tooltip, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { fieldOptionsFor, isComposed, normalizeComposeParts } from './fieldValueHelpers.jsx';
import FormatoAnioToggle from './FormatoAnioToggle';
import { FORMATO_ANIO } from './formatoCampo';
import { useSampleFeatures } from './sampleFeaturesContext';

const { Text } = Typography;

export const FieldSelect = ({ value, onChange, availableFields, placeholder = 'Campo', style }) => {
    const { samplesOf } = useSampleFeatures();
    return (
        <Select
            style={style}
            value={value || undefined}
            onChange={(v) => onChange(v ?? '')}
            options={fieldOptionsFor(availableFields, value, samplesOf)}
            placeholder={placeholder}
            showSearch
            allowClear
            filterOption={(input, option) => String(option.value).toLowerCase().includes(input.toLowerCase())}
        />
    );
};

const PartRow = ({ part, isSum, onChange, onRemove, availableFields }) => (
    <Space.Compact style={{ width: '100%', minWidth: 0 }}>
        {!isSum && (
            <Tooltip title="Texto antes del valor. Desaparece si la columna viene vacía.">
                <Input
                    style={{ width: 72, minWidth: 56 }}
                    value={part.prefix || ''}
                    onChange={(e) => onChange({ ...part, prefix: e.target.value || undefined })}
                    placeholder="antes"
                />
            </Tooltip>
        )}
        <FieldSelect
            style={{ flex: 1, minWidth: 0 }}
            value={part.field}
            onChange={(v) => onChange({ ...part, field: v })}
            availableFields={availableFields}
        />
        {!isSum && (
            <Tooltip title="Texto después del valor. Desaparece si la columna viene vacía.">
                <Input
                    style={{ width: 72, minWidth: 56 }}
                    value={part.suffix || ''}
                    onChange={(e) => onChange({ ...part, suffix: e.target.value || undefined })}
                    placeholder="después"
                />
            </Tooltip>
        )}
        <Button danger icon={<DeleteOutlined />} onClick={onRemove} />
    </Space.Compact>
);

const ComposeEditor = ({ value, onChange, availableFields, allowSum }) => {
    const parts = normalizeComposeParts(value?.compose);
    const isSum = value?.op === 'sum';

    const emit = (patch) => {
        const next = { compose: parts, sep: value?.sep, op: isSum ? 'sum' : undefined, ...patch };
        Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
        onChange(next);
    };

    return (
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            {allowSum && (
                <Segmented
                    value={isSum ? 'sum' : 'join'}
                    onChange={(v) => emit(v === 'sum'
                        ? { op: 'sum', sep: undefined }
                        : { op: undefined })}
                    options={[
                        { label: 'Unir texto', value: 'join' },
                        { label: 'Sumar', value: 'sum' },
                    ]}
                />
            )}
            {parts.map((part, idx) => (
                <PartRow
                    key={idx}
                    part={part}
                    isSum={isSum}
                    availableFields={availableFields}
                    onChange={(next) => emit({ compose: parts.map((p, i) => (i === idx ? next : p)) })}
                    onRemove={() => emit({ compose: parts.filter((_, i) => i !== idx) })}
                />
            ))}
            <Space size={6} style={{ width: '100%' }} wrap>
                <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => emit({ compose: [...parts, { field: '' }] })}
                >
                    Agregar columna
                </Button>
                {!isSum && (
                    <Input
                        size="small"
                        style={{ flex: 1, minWidth: 150, maxWidth: 190 }}
                        value={value?.sep ?? ''}
                        onChange={(e) => emit({ sep: e.target.value || undefined })}
                        placeholder=", "
                        addonBefore={<Text type="secondary" style={{ fontSize: 11 }}>Separador</Text>}
                    />
                )}
            </Space>
            <Text type="secondary" style={{ fontSize: 11 }}>
                {isSum
                    ? 'Suma las columnas numéricas. Las que no lo sean se ignoran.'
                    : 'Une las columnas en un solo valor. La columna vacía se va con su texto de antes y después.'}
            </Text>
        </Space>
    );
};

export const FieldValueField = ({
    value,
    onChange,
    availableFields,
    placeholder = 'Campo',
    allowSum = false,
    selectStyle,
    extraModes = [],
    mode: forcedMode = null,
    onModeChange = null,
}) => {
    const composed = isComposed(value);
    const mode = forcedMode ?? (composed ? 'compose' : 'field');

    const setMode = (next) => {
        if (next === mode) return;
        if (onModeChange && !['field', 'compose'].includes(next)) {
            onModeChange(next);
            return;
        }
        if (next === 'compose') {
            onChange({ compose: [{ field: value?.field || '' }] });
        } else {
            onChange({ field: normalizeComposeParts(value?.compose)[0]?.field || '' });
        }
        onModeChange?.(next);
    };

    return (
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            <Segmented
                value={mode}
                onChange={setMode}
                options={[
                    { label: 'Un campo', value: 'field' },
                    { label: 'Campos combinados', value: 'compose' },
                    ...extraModes,
                ]}
            />
            {mode === 'compose' && (
                <ComposeEditor
                    value={value}
                    onChange={onChange}
                    availableFields={availableFields}
                    allowSum={allowSum}
                />
            )}
            {mode === 'field' && (
                <Space.Compact style={{ width: '100%' }}>
                    <FieldSelect
                        style={selectStyle || { flex: 1 }}
                        value={value?.field}
                        onChange={(v) => onChange({ field: v })}
                        availableFields={availableFields}
                        placeholder={placeholder}
                    />
                    <FormatoAnioToggle
                        item={value}
                        onChange={(activo) => onChange(
                            activo ? { field: value?.field, formato: FORMATO_ANIO } : { field: value?.field },
                        )}
                    />
                </Space.Compact>
            )}
        </Space>
    );
};
