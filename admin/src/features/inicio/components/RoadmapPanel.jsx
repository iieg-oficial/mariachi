import { Card, Space, Tag, Timeline, Typography } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { BRAND, SEMANTIC } from '@app/providers/brand';
import SectionHeader from '@shared/components/SectionHeader';
import { CAPAS, metaServicio } from '@shared/services/catalogoServicios';
import { ROADMAP } from '@features/inicio/constants/roadmap';

const { Text } = Typography;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const NOMBRE_CAPA = CAPAS.reduce((acc, capa) => ({ ...acc, [capa.key]: capa.nombre }), {});

const salida = (fecha) => {
    if (!fecha) return 'Por salir';
    const [anio, mes, dia] = fecha.split('-');
    return `${Number(dia)} ${MESES[Number(mes) - 1]} ${anio}`;
};

const FichaProyecto = ({ proyecto }) => {
    const meta = metaServicio(proyecto.slug);
    const items = proyecto.versiones.map((v) => ({
        key: v.version,
        color: v.fecha ? BRAND.purple : SEMANTIC.neutral,
        content: (
            <Space orientation="vertical" size={2}>
                <Space size={8}>
                    <Tag color={v.fecha ? 'purple' : 'default'} style={{ marginInlineEnd: 0 }}>
                        {`v${v.version}`}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>{salida(v.fecha)}</Text>
                </Space>
                <Text style={{ fontSize: 13 }}>{v.motivo}</Text>
            </Space>
        ),
    }));

    return (
        <Card
            size="small"
            hoverable
            title={meta.label || proyecto.slug}
            extra={(
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {NOMBRE_CAPA[meta.capa] || 'Sin clasificar'}
                </Text>
            )}
            styles={{ body: { padding: '16px 16px 0' } }}
        >
            <Timeline items={items} />
        </Card>
    );
};

export default function RoadmapPanel() {
    return (
        <div>
            <SectionHeader
                icon={<RocketOutlined />}
                title="Hoja de ruta"
                subtitle="Versiones mayores del ecosistema"
            />
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 16,
            }}>
                {ROADMAP.map((proyecto) => (
                    <FichaProyecto key={proyecto.slug} proyecto={proyecto} />
                ))}
            </div>
        </div>
    );
}
