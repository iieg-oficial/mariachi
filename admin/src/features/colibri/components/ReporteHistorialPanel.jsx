import { Avatar, Collapse, Space, Spin, Timeline, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { formatDate } from '@features/colibri/constants';

const { Text } = Typography;

const ACCION_LABEL = {
    estado_cambiado: 'Cambió estado',
    nota_actualizada: 'Actualizó nota interna',
    asignado: 'Asignó usuario',
    direccion_asignada: 'Asignó dirección',
    severidad_cambiada: 'Cambió severidad',
    prioridad_cambiada: 'Cambió prioridad',
    marcado_duplicado: 'Marcó como duplicado',
    bloqueo_cambiado: 'Actualizó bloqueo',
    campo_cambiado: 'Modificó',
};

const ACCION_COLOR = {
    estado_cambiado: 'blue',
    nota_actualizada: 'gray',
    asignado: 'purple',
    direccion_asignada: 'cyan',
    severidad_cambiada: 'orange',
    prioridad_cambiada: 'orange',
    marcado_duplicado: 'red',
    bloqueo_cambiado: 'gold',
};

export default function ReporteHistorialPanel({ actividad, loading }) {
    return (
        <Collapse
            size="small"
            items={[{
                key: 'actividad',
                label: <Text strong style={{ fontSize: 12 }}>Historial de actividad{actividad.length > 0 && ` (${actividad.length})`}</Text>,
                children: loading ? (
                    <Spin size="small" />
                ) : actividad.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>Sin actividad registrada todavía. Los cambios futuros aparecerán aquí.</Text>
                ) : (
                    <Timeline
                        items={actividad.map((a) => ({
                            key: a.id,
                            color: ACCION_COLOR[a.accion] || 'gray',
                            content: (
                                <div style={{ fontSize: 12 }}>
                                    <Space size={6} align="center">
                                        <Avatar size={20} src={a.actorAvatarUrl} icon={<UserOutlined />} />
                                        <Text strong>{a.actorUsername || 'sistema'}</Text>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{ACCION_LABEL[a.accion] || a.accion}</Text>
                                    </Space>
                                    {a.detalle?.campo && (
                                        <div style={{ marginTop: 2, color: '#666' }}>
                                            <Text code style={{ fontSize: 10 }}>{a.detalle.campo}</Text>
                                            {': '}
                                            <Text delete style={{ fontSize: 11 }}>{String(a.detalle.anterior ?? '—')}</Text>
                                            {' → '}
                                            <Text style={{ fontSize: 11 }}>{String(a.detalle.nuevo ?? '—')}</Text>
                                        </div>
                                    )}
                                    {a.creadoEn && (
                                        <Text type="secondary" style={{ fontSize: 10 }}>{formatDate(a.creadoEn)}</Text>
                                    )}
                                </div>
                            ),
                        }))}
                    />
                ),
            }]}
        />
    );
}
