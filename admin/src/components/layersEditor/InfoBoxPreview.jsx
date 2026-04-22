import { Card, Empty, Space, Tag, Typography } from 'antd';

const { Title, Text } = Typography;

const DUMMY = {
    nombre: 'Parque Metropolitano',
    municipio: 'Guadalajara',
    tipo: 'Parque urbano',
    fecha: '2026-01-15',
    direccion: 'Av. Beethoven 5800',
    telefono: '33 1234 5678',
    horario: '6:00 - 21:00',
    responsable: 'SEMADET',
    categoria: 'Área verde',
    superficie: '186 ha',
    visitantes: '1,200,000/año',
};

const MUNICIPIO_STYLE = { color: '#FF8300', bg: '#FFF2E5' };
const CARACTERISTICA_STYLE = { color: '#7B61FF', bg: '#F3F0FF' };

const resolveValue = (field) => DUMMY[field] ?? `<${field}>`;

const BadgeFromFields = ({ fields, style }) => (
    <Space size={4} wrap>
        {(fields || []).map((f) => (
            <Tag
                key={f}
                style={{
                    background: style.bg,
                    color: style.color,
                    border: 'none',
                    borderRadius: 12,
                    padding: '2px 10px',
                }}
            >
                {resolveValue(f)}
            </Tag>
        ))}
    </Space>
);

const resolveConfig = (template, params) => {
    if (!template || template === 'custom') return params || null;
    const p = params || {};

    if (template === 'municipio') {
        return {
            header: resolveValue(p.title || 'nombre'),
            badges: [
                { fields: [p.municipio || 'nombre'], style: MUNICIPIO_STYLE },
                { fields: ['fecha'], style: { color: '#666', bg: '#f5f5f5' } },
            ],
            text: p.text,
            stats: p.stats || [],
            columns: p.columns || 1,
        };
    }
    if (template === 'punto') {
        return {
            header: resolveValue(p.title || 'nombre'),
            badges: [{ fields: [p.caracteristica || 'tipo'], style: CARACTERISTICA_STYLE }],
        };
    }
    if (template === 'punto_municipio') {
        return {
            header: resolveValue(p.title || 'nombre'),
            badges: [
                { fields: [p.municipio || 'municipio'], style: MUNICIPIO_STYLE },
                { fields: [p.caracteristica || 'tipo'], style: CARACTERISTICA_STYLE },
            ],
        };
    }
    if (template === 'punto_ubicacion' || template === 'punto_completo') {
        const badges = [
            { fields: [p.municipio || 'municipio'], style: MUNICIPIO_STYLE },
            ...(p.caracteristicas || []).map((f) => ({ fields: [f], style: CARACTERISTICA_STYLE })),
        ];
        return {
            header: resolveValue(p.title || 'nombre'),
            badges,
            list: p.list || [],
            iconText: p.iconTexts || [],
            text: template === 'punto_completo' ? p.text : null,
            stats: template === 'punto_completo' ? (p.stats || []) : [],
        };
    }
    return null;
};


export default function InfoBoxPreview({ template, params }) {
    if (!template) {
        return (
            <Empty
                description="Elige un preset para ver el preview"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
        );
    }

    if (template === 'custom') {
        return (
            <Card size="small" style={{ background: '#fafafa' }}>
                <Text type="secondary">Preview no disponible para <b>custom</b> — edita el JSON directamente.</Text>
            </Card>
        );
    }

    const cfg = resolveConfig(template, params);
    if (!cfg) return null;

    return (
        <Card size="small" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>{cfg.header}</Title>
            {cfg.badges?.length > 0 && (
                <Space direction="vertical" size={4} style={{ marginBottom: 8 }}>
                    {cfg.badges.map((b, i) => (
                        <BadgeFromFields key={i} fields={b.fields} style={b.style} />
                    ))}
                </Space>
            )}
            {cfg.list?.length > 0 && (
                <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                    {cfg.list.map((f) => (
                        <li key={f}><Text>{resolveValue(f)}</Text></li>
                    ))}
                </ul>
            )}
            {cfg.iconText?.length > 0 && (
                <Space direction="vertical" size={2} style={{ marginBottom: 8 }}>
                    {cfg.iconText.map((f) => (
                        <Space key={f} size={4}>
                            <span style={{ opacity: 0.6 }}>●</span>
                            <Text>{resolveValue(f)}</Text>
                        </Space>
                    ))}
                </Space>
            )}
            {cfg.text && <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{cfg.text}</Text>}
            {cfg.stats?.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cfg.columns || 1}, 1fr)`,
                    gap: 8,
                    marginTop: 8,
                }}>
                    {cfg.stats.map((s, i) => (
                        <Card key={i} size="small" style={{ textAlign: 'center', background: '#fafafa' }}>
                            <Text strong>{s.valor || '—'}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 11 }}>{s.nombre || '—'}</Text>
                        </Card>
                    ))}
                </div>
            )}
            <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 11 }}>
                Preview con datos dummy. Los campos &lt;placeholder&gt; se resolverán desde las propiedades del feature.
            </Text>
        </Card>
    );
}
