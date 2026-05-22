import { Card, Empty, Space, Tag, Typography } from 'antd';

import { isTextKey, mkTextKey, normalizeInfoboxConfig, textIdOf } from './infoBoxTextBlocks';

const { Title, Text } = Typography;

const DUMMY = {
    nombre: 'Parque Metropolitano',
    nombre_unidad: 'IMSS Clínica Norte',
    nombre_institucion: 'Instituto Mexicano del Seguro Social',
    nivel_atencion: 'Primer nivel',
    nombre_tipo_establecimiento: 'Unidad Médica',
    estatus_operacion: 'En operación',
    municipio: 'Guadalajara',
    region: 'Centro',
    tipo: 'Parque urbano',
    fecha: '2026-01-15',
    valor: '23.5',
    domicilio: 'Av. Beethoven 5800',
    direccion: 'Av. Beethoven 5800',
    telefono: '33 1234 5678',
    telefono_1: '33 1234 5678',
    horario: '6:00 - 21:00',
    responsable: 'SEMADET',
    categoria: 'Área verde',
    superficie: '186 ha',
    visitantes: '1,200,000/año',
    clave_geo: '14039',
    area_km2: '187.91',
    area_ha: '18,791',
};

const resolveValue = (field) => {
    if (typeof field !== 'string') return '';
    if (DUMMY[field] !== undefined) return DUMMY[field];
    const lower = field.toLowerCase();
    for (const k of Object.keys(DUMMY)) {
        if (lower.includes(k)) return DUMMY[k];
    }
    return `<${field}>`;
};

const FieldBadge = ({ entry, parentStyle }) => {
    if (typeof entry === 'string') {
        return (
            <Tag
                style={{
                    background: parentStyle?.bg || '#F0F0F0',
                    color: parentStyle?.color || '#262626',
                    border: 'none',
                    borderRadius: 12,
                    padding: '2px 10px',
                }}
            >
                {resolveValue(entry)}
            </Tag>
        );
    }
    if (entry && typeof entry === 'object' && entry.field) {
        return (
            <Tag
                style={{
                    background: entry.bg || parentStyle?.bg || '#F0F0F0',
                    color: entry.color || parentStyle?.color || '#262626',
                    border: 'none',
                    borderRadius: 12,
                    padding: '2px 10px',
                    width: entry.fullWidth ? '100%' : undefined,
                    textAlign: entry.fullWidth ? 'center' : undefined,
                }}
            >
                {resolveValue(entry.field)}
            </Tag>
        );
    }
    return null;
};

const StaticBadge = ({ entry, parentStyle }) => {
    const text = typeof entry === 'object' ? (entry.fallback || entry.dynamic || '') : entry;
    return (
        <Tag
            style={{
                background: parentStyle?.bg || '#F0F0F0',
                color: parentStyle?.color || '#262626',
                border: 'none',
                borderRadius: 12,
                padding: '2px 10px',
            }}
        >
            {text}
        </Tag>
    );
};

const LabelGroup = ({ group }) => {
    if (group.staticValues) {
        return (
            <Space size={4} wrap style={{ width: group.fullWidth ? '100%' : undefined }}>
                {group.staticValues.map((s, i) => (
                    <StaticBadge key={i} entry={s} parentStyle={{ color: group.color, bg: group.bg }} />
                ))}
            </Space>
        );
    }
    return (
        <Space size={4} wrap style={{ width: group.fullWidth ? '100%' : undefined }}>
            {(group.fields || []).map((f, i) => (
                <FieldBadge key={i} entry={f} parentStyle={{ color: group.color, bg: group.bg }} />
            ))}
        </Space>
    );
};

const formatCardValue = (raw, decimals) => {
    if (decimals === undefined || decimals === null) return raw;
    const n = Number(raw);
    if (Number.isNaN(n)) return raw;
    return n.toFixed(decimals);
};

const Cards = ({ items, columns = 1 }) => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 8,
    }}>
        {items.map((it, i) => (
            <div key={i} style={{
                background: '#fafafa',
                borderRadius: 6,
                padding: '6px 8px',
                textAlign: 'center',
            }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{formatCardValue(resolveValue(it.field), it.decimals)}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>{it.label}</Text>
            </div>
        ))}
    </div>
);

const ListItems = ({ items }) => (
    <div>
        {items.map((it, i) => {
            const value = resolveValue(it.field);
            const valueEl = it.href
                ? <span style={{ fontSize: 12, color: '#5C2472', textDecoration: 'underline' }}>{value}</span>
                : <Text style={{ fontSize: 12 }}>{value}</Text>;
            return (
                <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '4px 0',
                    borderBottom: i < items.length - 1 ? '1px dashed #f0f0f0' : 'none',
                }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{it.label}</Text>
                    {valueEl}
                </div>
            );
        })}
    </div>
);

const ICON_GLYPH = {
    ubicacion: '📍',
    celular: '📞',
    web: '🌐',
    hombre: '♂',
    mujer: '♀',
    info: 'ⓘ',
    novedades: '★',
    aviso_privacidad: '🛡',
};

const IconTexts = ({ items }) => (
    <Space orientation="vertical" size={4} style={{ width: '100%' }}>
        {items.map((it, i) => (
            <Space key={i} size={6}>
                <span style={{ fontSize: 14 }}>{ICON_GLYPH[it.icon] || '•'}</span>
                <Text style={{ fontSize: 12, color: '#5C2472', textDecoration: 'underline' }}>
                    {resolveValue(it.field)}
                </Text>
            </Space>
        ))}
    </Space>
);


const DEFAULT_BODY_ORDER = ['labelGroups', 'list', 'iconText', 'text', 'cards'];

const expandPresentKeys = (cfg) => {
    const out = [];
    for (const k of DEFAULT_BODY_ORDER) {
        if (k === 'text') {
            (cfg.text || []).forEach((b) => {
                if (b?.items?.length) out.push(mkTextKey(b.id));
            });
        } else if (cfg[k]?.length) {
            out.push(k);
        }
    }
    return out;
};

const resolveBodyOrder = (cfg) => {
    const present = expandPresentKeys(cfg);
    const explicit = Array.isArray(cfg.blockOrder)
        ? cfg.blockOrder.filter((k) => present.includes(k))
        : [];
    const remaining = present.filter((k) => !explicit.includes(k));
    return [...explicit, ...remaining];
};

const renderTextItem = (it, idx) => {
    const value = it.field ? resolveValue(it.field) : null;
    const label = it.label || null;
    if (!label && !value) return null;
    const content = label && value ? <><strong>{label}</strong>: {value}</> : (value || label);
    const linkStyle = it.href ? { color: '#5C2472', textDecoration: 'underline' } : null;
    return (
        <div key={idx} style={{ fontSize: 11, color: '#465055', marginBottom: 8, ...linkStyle }}>
            {content}
        </div>
    );
};

const renderTextBlock = (key, cfg) => {
    const block = (cfg.text || []).find((b) => b.id === textIdOf(key));
    const rendered = (block?.items || []).map(renderTextItem).filter(Boolean);
    if (!rendered.length) return null;
    return <div key={key}>{rendered}</div>;
};

const renderBodyBlock = (key, cfg) => {
    if (isTextKey(key)) {
        return renderTextBlock(key, cfg);
    }
    if (key === 'labelGroups' && cfg.labelGroups?.length) {
        return (
            <Space key="labelGroups" orientation="vertical" size={4} style={{ width: '100%', marginBottom: 8 }}>
                {cfg.labelGroups.map((g, i) => <LabelGroup key={i} group={g} />)}
            </Space>
        );
    }
    if (key === 'list' && cfg.list?.length) {
        return <div key="list" style={{ marginBottom: 8 }}><ListItems items={cfg.list} /></div>;
    }
    if (key === 'iconText' && cfg.iconText?.length) {
        return <div key="iconText" style={{ marginBottom: 8 }}><IconTexts items={cfg.iconText} /></div>;
    }
    if (key === 'cards' && cfg.cards?.length) {
        return <div key="cards"><Cards items={cfg.cards} columns={cfg.cardsColumns || 1} /></div>;
    }
    return null;
};


export default function InfoBoxPreview({ params, value }) {
    const raw = value ?? params ?? null;
    const cfg = normalizeInfoboxConfig(raw);

    if (!cfg || (typeof cfg === 'object' && Object.keys(cfg).length === 0)) {
        return (
            <Empty
                description="Configura bloques para ver el preview"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
        );
    }

    const headerText = cfg.headerField
        ? (DUMMY[cfg.headerField] !== undefined || /^[a-z_][a-z0-9_]*$/i.test(cfg.headerField)
            ? resolveValue(cfg.headerField)
            : cfg.headerField)
        : null;

    const bodyOrder = resolveBodyOrder(cfg);

    return (
        <Card
            size="small"
            style={{
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                width: 280,
            }}
        >
            {headerText && (
                <div style={{
                    background: '#EFF3FC',
                    margin: '-12px -12px 8px',
                    padding: '10px 12px',
                    borderRadius: '8px 8px 0 0',
                }}>
                    <Title level={5} style={{ margin: 0, fontSize: 13 }}>{headerText}</Title>
                </div>
            )}
            {bodyOrder.map((key) => renderBodyBlock(key, cfg))}
        </Card>
    );
}
