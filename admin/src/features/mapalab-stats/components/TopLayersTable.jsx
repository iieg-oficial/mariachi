import { Card, Empty, Table, Tag, Typography } from 'antd';

const { Text } = Typography;

const TopLayersTable = ({ rows = [], loading }) => {
    if (!loading && rows.length === 0) {
        return (
            <Card title="Capas más usadas" size="small">
                <Empty description="Sin datos aún. Los eventos del visor toman unos minutos en agregarse." />
            </Card>
        );
    }

    const columns = [
        {
            title: 'Capa',
            dataIndex: 'layerId',
            key: 'layerId',
            render: (id, row) => (
                <div>
                    <Text strong>{row.label || id}</Text>
                    {row.workspace && <Tag style={{ marginLeft: 8 }} color="purple">{row.workspace}</Tag>}
                    <br />
                    <Text type="secondary" code style={{ fontSize: 11 }}>{id}</Text>
                </div>
            ),
        },
        { title: 'Activaciones', dataIndex: 'activations', key: 'activations', width: 110, align: 'right',
            sorter: (a, b) => a.activations - b.activations, defaultSortOrder: 'descend' },
        { title: 'Detalle', dataIndex: 'detailOpens', key: 'detailOpens', width: 90, align: 'right' },
        { title: 'Clicks', dataIndex: 'featureClicks', key: 'featureClicks', width: 90, align: 'right' },
        { title: 'Opacidad', dataIndex: 'opacityChanges', key: 'opacityChanges', width: 90, align: 'right' },
        { title: 'Descargas', dataIndex: 'downloads', key: 'downloads', width: 100, align: 'right' },
        { title: 'Sesiones únicas', dataIndex: 'uniqueSessions', key: 'uniqueSessions', width: 130, align: 'right',
            sorter: (a, b) => a.uniqueSessions - b.uniqueSessions },
    ];

    return (
        <Card title="Capas más usadas" size="small">
            <Table
                rowKey="layerId"
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

export default TopLayersTable;
