import { Card, Descriptions, Empty, Table, Tag, Typography } from 'antd';
import TituloConAyuda from '@shared/components/TituloConAyuda';
import { ESTADOS_SYNC } from '../constants/secciones';

const { Text } = Typography;

const fecha = (iso) => (iso ? new Date(`${iso}Z`).toLocaleString('es-MX') : '—');

const fuentesTexto = (fuentes) => Object.entries(fuentes || {}).map(([nombre, f]) => (
    <Tag key={nombre} color={f?.estado === 'ok' ? 'success' : 'warning'}>{nombre}</Tag>
));

const COLUMNAS = [
    { title: 'Terminó', dataIndex: 'terminado_en', render: fecha },
    {
        title: 'Estado',
        dataIndex: 'estado',
        render: (estado) => <Tag color={ESTADOS_SYNC[estado]?.color}>{ESTADOS_SYNC[estado]?.etiqueta ?? estado}</Tag>,
    },
    { title: 'Fuentes', dataIndex: 'fuentes', render: fuentesTexto },
    { title: 'Nuevos', dataIndex: 'nuevos', render: (n) => (n?.length ? n.join(', ') : '—') },
    { title: 'Actualizados', dataIndex: 'actualizados' },
    { title: 'Duración', dataIndex: 'duracion_ms', render: (ms) => `${Math.round(ms / 1000)} s` },
];

export default function SincronizacionesPanel({ sincronizaciones, loading }) {
    const ultima = sincronizaciones[0];
    return (
        <Card
            size="small"
            title={(
                <TituloConAyuda
                    titulo="Sincronización"
                    ayuda="El sincronizador lee la BD del ETL, Airflow y los README de ETL-SIEEJ en cada ciclo, crea los pipelines nuevos y actualiza tablas, vistas y estados de DAG. Nunca pisa una sección editada a mano."
                />
            )}
            style={{ marginBottom: 16 }}
        >
            {!ultima && !loading && <Empty description="Aún no hay sincronizaciones" />}
            {ultima && (
                <Descriptions size="small" column={{ xs: 1, md: 4 }} style={{ marginBottom: 12 }}>
                    <Descriptions.Item label="Última">{fecha(ultima.terminado_en)}</Descriptions.Item>
                    <Descriptions.Item label="Estado">
                        <Tag color={ESTADOS_SYNC[ultima.estado]?.color}>{ESTADOS_SYNC[ultima.estado]?.etiqueta}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Fuentes">{fuentesTexto(ultima.fuentes)}</Descriptions.Item>
                    <Descriptions.Item label="Versión"><Text code>{ultima.version || '—'}</Text></Descriptions.Item>
                </Descriptions>
            )}
            {sincronizaciones.length > 1 && (
                <Table
                    size="small"
                    rowKey="id"
                    loading={loading}
                    columns={COLUMNAS}
                    dataSource={sincronizaciones.slice(1, 8)}
                    pagination={false}
                    expandable={{
                        rowExpandable: (r) => r.errores?.length > 0,
                        expandedRowRender: (r) => r.errores.map((e) => <div key={e}><Text type="secondary">{e}</Text></div>),
                    }}
                />
            )}
        </Card>
    );
}
