import { Typography } from 'antd';

const { Text } = Typography;

const VALUE_KEYS = ['field', 'compose', 'sep', 'op'];

export const fieldOptionsFor = (availableFields, currentValues = [], samplesOf = null) => {
    const opts = (availableFields || []).map((f) => {
        const muestras = samplesOf ? samplesOf(f.name) : [];
        return {
            value: f.name,
            label: (
                <span>
                    <span style={{ fontFamily: 'monospace' }}>{f.name}</span>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>{f.type}</Text>
                    {muestras.length > 0 && (
                        <Text
                            type="secondary"
                            style={{ fontSize: 11, display: 'block', fontFamily: 'monospace', opacity: .75 }}
                            ellipsis
                        >
                            {muestras.join(' · ')}
                        </Text>
                    )}
                </span>
            ),
        };
    });
    const arr = Array.isArray(currentValues) ? currentValues : [currentValues];
    for (const v of arr) {
        if (typeof v === 'string' && v && !opts.find((o) => o.value === v)) {
            opts.unshift({ value: v, label: <span style={{ fontFamily: 'monospace' }}>{v}</span> });
        }
    }
    return opts;
};

export const isComposed = (item) => !item?.field && Array.isArray(item?.compose);

export const withValueDef = (item, next) => {
    const rest = { ...item };
    VALUE_KEYS.forEach((k) => delete rest[k]);
    return { ...rest, ...next };
};

export const normalizeComposeParts = (compose) => (Array.isArray(compose) ? compose : [])
    .map((part) => (typeof part === 'string' ? { field: part } : { ...part }));
