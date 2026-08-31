import { Card, Empty, Space, Tag, Typography } from 'antd';

import { buildCardPlan, normalizeConfig, referencedFields } from '@shared/infoboxPlan';

const { Title, Text } = Typography;

const EJEMPLOS = {
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
    calle: 'Av. Beethoven',
    numero_ext: '5800',
    colonia: 'La Estancia',
    cp: '45030',
    telefono: '33 1234 5678',
    telefono_1: '33 1234 5678',
    horario: '6:00 - 21:00',
    responsable: 'SEMADET',
    categoria: 'Área verde',
    superficie: '186 ha',
    visitantes: '1200000',
    clave_geo: '14039',
    area_km2: '187.91',
    area_ha: '18791',
};

const ejemploPara = (campo) => {
    if (EJEMPLOS[campo] !== undefined) return EJEMPLOS[campo];
    const bajo = campo.toLowerCase();
    for (const k of Object.keys(EJEMPLOS)) {
        if (bajo.includes(k)) return EJEMPLOS[k];
    }
    return `<${campo}>`;
};

const featureDeEjemplo = (cfg) => {
    const props = {};
    referencedFields(cfg).forEach((campo) => { props[campo] = ejemploPara(campo); });
    return props;
};

const ICONO = {
    ubicacion: '📍', celular: '📞', web: '🌐', hombre: '♂', mujer: '♀',
    info: 'ⓘ', novedades: '★', aviso_privacidad: '🛡',
};

const Etiquetas = ({ block }) => block.groups.map((grupo, i) => (
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

const Lista = ({ block }) => (
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

const Iconos = ({ block }) => (
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

const Parrafos = ({ block }) => (
    <div>
        {block.items.map((it, i) => (
            <div key={i} style={{ fontSize: 11, color: '#465055', marginBottom: 8, ...(it.href ? { color: '#5C2472', textDecoration: 'underline' } : {}) }}>
                {it.label && it.value ? <><strong>{it.label}</strong>: {it.value}</> : (it.value || it.label)}
            </div>
        ))}
    </div>
);

const Cifras = ({ block }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${block.columns}, 1fr)`, gap: 8 }}>
        {block.cards.map((c, i) => (
            <div key={i} style={{ background: '#fafafa', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.value}{c.suffix}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>{c.label}</Text>
            </div>
        ))}
    </div>
);

const PINTORES = {
    labelGroups: Etiquetas,
    list: Lista,
    iconText: Iconos,
    text: Parrafos,
    cards: Cifras,
};

export default function InfoBoxPreview({ params, value, properties = null }) {
    const crudo = value ?? params ?? null;
    const cfg = normalizeConfig(crudo);

    if (!cfg || (typeof cfg === 'object' && Object.keys(cfg).length === 0)) {
        return <Empty description="Configura bloques para ver el preview" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    const plan = buildCardPlan(properties || featureDeEjemplo(cfg), cfg, { variant: 'desktop' });
    if (!plan || plan.isEmpty) {
        return <Empty description="La tarjetita no muestra ningún dato" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
        <Card size="small" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', width: 280 }}>
            {plan.title && (
                <div style={{ background: '#EFF3FC', margin: '-12px -12px 8px', padding: '10px 12px', borderRadius: '8px 8px 0 0' }}>
                    <Title level={5} style={{ margin: 0, fontSize: 13 }}>{plan.title}</Title>
                </div>
            )}
            {plan.blocks.map((block) => {
                const Pintor = PINTORES[block.type];
                return Pintor ? <Pintor key={block.key} block={block} /> : null;
            })}
        </Card>
    );
}
