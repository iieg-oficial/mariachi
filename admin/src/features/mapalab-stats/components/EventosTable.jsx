import { Card, Empty, Table, Typography } from 'antd';

const { Text } = Typography;

const EventosTable = ({ rows = [], loading }) => {
    if (!loading && rows.length === 0) {
        return (
            <Card title="Eventos más abiertos (últimos 30 días)" size="small">
                <Empty description="Sin datos aún. Abrir un evento en el visor cuenta como una apertura." />
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
        { title: 'Aperturas', dataIndex: 'opens', key: 'opens', width: 110, align: 'right',
            sorter: (a, b) => a.opens - b.opens, defaultSortOrder: 'descend' },
        { title: 'Cierres', dataIndex: 'closes', key: 'closes', width: 90, align: 'right' },
        { title: 'Sesiones únicas', dataIndex: 'uniqueSessions', key: 'uniqueSessions', width: 130, align: 'right',
            sorter: (a, b) => a.uniqueSessions - b.uniqueSessions },
    ];

    return (
        <Card title="Eventos más abiertos (últimos 30 días)" size="small">
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
