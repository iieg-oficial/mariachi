import { Space, Tag, Typography } from 'antd';

const { Text } = Typography;

const ICONO = {
    ubicacion: '📍', celular: '📞', web: '🌐', hombre: '♂', mujer: '♀',
    info: 'ⓘ', novedades: '★', aviso_privacidad: '🛡',
};

const pintarEtiquetas = ({ block }) => block.groups.map((grupo, i) => (
    <Space key={i} size={4} wrap style={{ width: '100%', marginBottom: 8 }}>
        {grupo.labels.map((et, j) => (
            <Tag key={j} style={{
                background: et.bg || '#F0F0F0', color: et.color || '#262626', border: 'none',
                borderRadius: 12, padding: '2px 10px',
                width: et.fullWidth ? '100%' : undefined,
                textAlign: et.fullWidth ? 'center' : undefined,
            }}>{et.value}</Tag>
        ))}
    </Space>
));

const pintarLista = ({ block }) => (
    <div style={{ marginBottom: 8 }}>
        {block.rows.map((row, i) => (
            <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0',
                borderBottom: i < block.rows.length - 1 ? '1px dashed #f0f0f0' : 'none',
            }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{row.label}</Text>
                <span style={{ fontSize: 12, textAlign: 'right', ...(row.href ? { color: '#5C2472', textDecoration: 'underline' } : {}) }}>
                    {row.values?.length
                        ? row.values.map((v, j) => <div key={j}>{v}</div>)
                        : row.value}
                </span>
            </div>
        ))}
    </div>
);

const pintarIconos = ({ block }) => (
    <Space orientation="vertical" size={4} style={{ width: '100%', marginBottom: 8 }}>
        {block.items.map((it, i) => (
            <Space key={i} size={6}>
                <span style={{ fontSize: 14 }}>{ICONO[it.icon] || '•'}</span>
                <Text style={{ fontSize: 12, ...(it.href || it.action ? { color: '#5C2472', textDecoration: 'underline' } : { color: '#465055' }) }}>
                    {it.value}
                </Text>
            </Space>
        ))}
    </Space>
);

const pintarParrafos = ({ block }) => (
    <div>
        {block.items.map((it, i) => (
            <div key={i} style={{ fontSize: 11, color: '#465055', marginBottom: 8, ...(it.href ? { color: '#5C2472', textDecoration: 'underline' } : {}) }}>
                {it.label && it.value ? <><strong>{it.label}</strong>: {it.value}</> : (it.value || it.label)}
            </div>
        ))}
    </div>
);

const pintarCifras = ({ block }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${block.columns}, 1fr)`, gap: 8 }}>
        {block.cards.map((c, i) => (
            <div key={i} style={{ background: '#fafafa', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.value}{c.suffix}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>{c.label}</Text>
            </div>
        ))}
    </div>
);

export const PINTORES = {
    labelGroups: pintarEtiquetas,
    list: pintarLista,
    iconText: pintarIconos,
    text: pintarParrafos,
    cards: pintarCifras,
};

export const pintarBloque = (block) => PINTORES[block.type]?.({ block }) ?? null;
