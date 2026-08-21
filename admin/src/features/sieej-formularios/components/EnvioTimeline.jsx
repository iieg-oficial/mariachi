import { Empty, Space, Timeline, Typography } from 'antd';

const { Text } = Typography;

const EVENTO = {
    iniciado: { color: 'gray', label: 'Inició el formulario' },
    guardado: { color: 'gold', label: 'Guardó un avance' },
    enviado: { color: 'green', label: 'Envió el formulario' },
    expirado: { color: 'red', label: 'El envío expiró' },
    reabierto: { color: 'blue', label: 'El envío fue reabierto' },
    actualizado: { color: 'purple', label: 'Corrigió campos del envío' },
};

const fmt = (v) => (v ? new Date(v).toLocaleString() : '—');

const detalle = (evento) => {
    const campos = evento.payload?.campos;
    if (!Array.isArray(campos) || !campos.length) return null;
    return campos.length > 3
        ? `${campos.slice(0, 3).join(', ')} y ${campos.length - 3} más`
        : campos.join(', ');
};

export default function EnvioTimeline({ eventos = [] }) {
    if (!eventos.length) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin actividad registrada" />;
    }
    return (
        <Timeline
            items={eventos.map((evento) => {
                const meta = EVENTO[evento.tipo] || { color: 'gray', label: evento.tipo };
                const campos = detalle(evento);
                return {
                    key: evento.id,
                    color: meta.color,
                    children: (
                        <Space orientation="vertical" size={0}>
                            <Text style={{ fontSize: 13 }}>
                                <Text strong style={{ fontSize: 13 }}>
                                    {evento.actor_nombre || 'Alguien'}
                                </Text>
                                {` · ${meta.label}`}
                            </Text>
                            {campos && (
                                <Text type="secondary" style={{ fontSize: 11 }}>{campos}</Text>
                            )}
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {fmt(evento.ocurrido_en)}
                            </Text>
                        </Space>
                    ),
                };
            })}
        />
    );
}
