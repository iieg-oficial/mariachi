import { Avatar, Progress, Space, Tooltip, Typography } from 'antd';
import { resumirCaptura } from './snapshotUtils';

const { Text } = Typography;

const COLORES = ['#5C2472', '#FF8300', '#1E7B7B', '#B23A6E', '#2F5FAF'];

const iniciales = (nombre) => String(nombre || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();

const fmt = (v) => (v ? new Date(v).toLocaleString() : '—');

export default function CapturaPorPersona({ autoria }) {
    const { total, personas } = resumirCaptura(autoria);
    if (!personas.length) return null;

    return (
        <div>
            <Text strong style={{ fontSize: 13 }}>Capturado por</Text>
            <Space orientation="vertical" size={6} style={{ width: '100%', marginTop: 8 }}>
                {personas.map((persona, i) => (
                    <Space key={persona.nombre} align="center" style={{ width: '100%' }}>
                        <Tooltip title={`Último cambio: ${fmt(persona.ultimo)}`}>
                            <Avatar
                                size={22}
                                style={{
                                    backgroundColor: COLORES[i % COLORES.length],
                                    fontSize: 10,
                                }}
                            >
                                {iniciales(persona.nombre)}
                            </Avatar>
                        </Tooltip>
                        <Text style={{ fontSize: 12, width: 160 }} ellipsis>{persona.nombre}</Text>
                        <Text type="secondary" style={{ fontSize: 12, width: 80 }}>
                            {persona.campos} campo{persona.campos === 1 ? '' : 's'}
                        </Text>
                        <Progress
                            percent={persona.porcentaje}
                            size="small"
                            strokeColor={COLORES[i % COLORES.length]}
                            style={{ width: 140, marginBottom: 0 }}
                        />
                    </Space>
                ))}
            </Space>
            <Text type="secondary" style={{ fontSize: 11 }}>
                {total} campo{total === 1 ? '' : 's'} con autoría registrada
            </Text>
        </div>
    );
}
