import { Space, Tag, Typography } from 'antd';

const { Text } = Typography;

const ICONO = {
    ubicacion: '📍', celular: '📞', web: '🌐', hombre: '♂', mujer: '♀',
    info: 'ⓘ', novedades: '★', aviso_privacidad: '🛡',
};

// La tarjeta mide 239 px y los valores vienen de columnas reales: nombres larguísimos,
// claves sin espacios, URLs. Todo lo que pinte texto parte palabra si hace falta y todo
// contenedor flex lleva minWidth 0, o el contenido empuja la tarjeta y se desborda.
const CORTA_PALABRA = { overflowWrap: 'anywhere', wordBreak: 'break-word', minWidth: 0 };

const pintarEtiquetas = ({ block }) => block.groups.map((grupo, i) => (
    <Space key={i} size={4} wrap style={{ width: '100%', marginBottom: 8, minWidth: 0 }}>
        {grupo.labels.map((et, j) => (
            <Tag key={j} style={{
                background: et.bg || '#F0F0F0', color: et.color || '#262626', border: 'none',
                borderRadius: 12, padding: '2px 10px',
                width: et.fullWidth ? '100%' : undefined,
                textAlign: et.fullWidth ? 'center' : undefined,
                maxWidth: '100%', whiteSpace: 'normal', height: 'auto',
                ...CORTA_PALABRA,
            }}>{et.value}</Tag>
        ))}
    </Space>
));

const pintarLista = ({ block }) => (
    <div style={{ marginBottom: 8, minWidth: 0 }}>
        {block.rows.map((row, i) => (
            <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0',
                alignItems: 'baseline', minWidth: 0,
                borderBottom: i < block.rows.length - 1 ? '1px dashed #f0f0f0' : 'none',
            }}>
                <Text type="secondary" style={{ fontSize: 12, flex: '0 1 auto', ...CORTA_PALABRA }}>
                    {row.label}
                </Text>
                <span style={{
                    fontSize: 12, textAlign: 'right', flex: '1 1 auto',
                    ...CORTA_PALABRA,
                    ...(row.href ? { color: '#5C2472', textDecoration: 'underline' } : {}),
                }}>
                    {row.values?.length
                        ? row.values.map((v, j) => <div key={j} style={CORTA_PALABRA}>{v}</div>)
                        : row.value}
                </span>
            </div>
        ))}
    </div>
);

const pintarIconos = ({ block }) => (
    <Space orientation="vertical" size={4} style={{ width: '100%', marginBottom: 8, minWidth: 0 }}>
        {block.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'baseline', minWidth: 0 }}>
                <span style={{ fontSize: 14, flex: '0 0 auto' }}>{ICONO[it.icon] || '•'}</span>
                <Text style={{
                    fontSize: 12, flex: '1 1 auto', ...CORTA_PALABRA,
                    ...(it.href || it.action ? { color: '#5C2472', textDecoration: 'underline' } : { color: '#465055' }),
                }}>
                    {it.value}
                </Text>
            </div>
        ))}
    </Space>
);

const pintarParrafos = ({ block }) => (
    <div style={{ minWidth: 0 }}>
        {block.items.map((it, i) => (
            <div key={i} style={{
                fontSize: 11, color: '#465055', marginBottom: 8, ...CORTA_PALABRA,
                ...(it.href ? { color: '#5C2472', textDecoration: 'underline' } : {}),
            }}>
                {it.label && it.value ? <><strong>{it.label}</strong>: {it.value}</> : (it.value || it.label)}
            </div>
        ))}
    </div>
);

const pintarCifras = ({ block }) => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${block.columns}, minmax(0, 1fr))`,
        gap: 8, minWidth: 0,
    }}>
        {block.cards.map((c, i) => (
            <div key={i} style={{
                background: '#fafafa', borderRadius: 6, padding: '6px 8px',
                textAlign: 'center', minWidth: 0,
            }}>
                <div style={{ fontWeight: 600, fontSize: 14, ...CORTA_PALABRA }}>{c.value}{c.suffix}</div>
                <Text type="secondary" style={{ fontSize: 11, ...CORTA_PALABRA }}>{c.label}</Text>
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
