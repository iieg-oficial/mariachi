import { Card, Empty, Typography } from 'antd';

import { buildCardPlan, normalizeConfig, referencedFields } from '@shared/infoboxPlan';
import { pintarBloque } from './infoBoxPainters.jsx';

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

export default function InfoBoxPreview({ params, value, properties = null, variant = 'desktop' }) {
    const crudo = value ?? params ?? null;
    const cfg = normalizeConfig(crudo);

    if (!cfg || (typeof cfg === 'object' && Object.keys(cfg).length === 0)) {
        return <Empty description="Configura bloques para ver el preview" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    const plan = buildCardPlan(properties || featureDeEjemplo(cfg), cfg, { variant });
    if (!plan || plan.isEmpty) {
        return <Empty description="La tarjetita no muestra ningún dato" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
        <Card size="small" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', width: 239 }}>
            {plan.title && (
                <div style={{ background: '#EFF3FC', margin: '-12px -12px 8px', padding: '10px 12px', borderRadius: '8px 8px 0 0' }}>
                    <Title level={5} style={{ margin: 0, fontSize: 13 }}>{plan.title}</Title>
                </div>
            )}
            {plan.blocks.map((block) => (
                <div key={block.key}>{pintarBloque(block)}</div>
            ))}
        </Card>
    );
}
