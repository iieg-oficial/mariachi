import { Card, Empty, Table, Tag, Tooltip, Typography } from 'antd';

const { Text } = Typography;

const NO_APLICA = '—';

const soloCompleto = (valor, row) => (row.modo === 'lite' ? <Text type="secondary">{NO_APLICA}</Text> : valor);

const numerica = (title, key, render) => ({
    title,
    dataIndex: key,
    key,
    align: 'right',
    sorter: (a, b) => (a[key] ?? 0) - (b[key] ?? 0),
    ...(render ? { render } : {}),
});

const EventosTable = ({ rows = [], loading }) => {
    if (!loading && rows.length === 0) {
        return (
            <Card title="Eventos" size="small">
                <Empty description="Sin datos aún. Abrir un evento o un dato curioso en el visor cuenta como uso." />
            </Card>
        );
    }

    const columns = [
        {
            title: 'Evento',
            dataIndex: 'eventoId',
            key: 'eventoId',
            render: (id, row) => (
                <div>
                    <Text strong>{row.titulo || `Evento ${id}`}</Text>
                    <br />
                    <Text type="secondary" code style={{ fontSize: 11 }}>{id}</Text>
                </div>
            ),
        },
        {
            title: 'Modo',
            dataIndex: 'modo',
            key: 'modo',
            render: (modo) => (modo ? <Tag>{modo === 'lite' ? 'Lite' : 'Completo'}</Tag> : null),
        },
        numerica('Aperturas', 'opens', soloCompleto),
        numerica('Datos curiosos', 'funFacts'),
        numerica(<Tooltip title="Clics a «Volver» después de que el águila llevó a un dato curioso">Regresos</Tooltip>, 'returns'),
        numerica('Centrar', 'centers', soloCompleto),
        numerica('Compartir', 'shares', soloCompleto),
        numerica(<Tooltip title="Visitas distintas al visor en el periodo. Se cuentan sobre los eventos de los últimos 90 días; más atrás se suman por día.">Sesiones</Tooltip>, 'uniqueSessions'),
    ];

    return (
        <Card title="Eventos" size="small">
            <Table
                rowKey="eventoId"
                size="small"
                loading={loading}
                columns={columns}
                dataSource={rows}
                pagination={false}
                scroll={{ x: true }}
            />
        </Card>
    );
};

export default EventosTable;
