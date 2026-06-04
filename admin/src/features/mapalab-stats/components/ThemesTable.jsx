import { Card, Empty, Table, Typography } from 'antd';

const { Text } = Typography;

const ThemesTable = ({ rows = [], loading }) => {
    if (!loading && rows.length === 0) {
        return (
            <Card title="Temas más vistos" size="small">
                <Empty description="Sin datos aún. Abrir un tema temático en el visor cuenta como una vista." />
            </Card>
        );
    }

    const columns = [
        {
            title: 'Tema',
            dataIndex: 'themeId',
            key: 'themeId',
            render: (id, row) => (
                <div>
                    <Text strong>{row.label || id}</Text>
                    {row.workspace && (
                        <>
                            <br />
                            <Text type="secondary" style={{ fontSize: 11 }}>{row.workspace}</Text>
                        </>
                    )}
                </div>
            ),
        },
        { title: 'Aperturas', dataIndex: 'views', key: 'views', width: 110, align: 'right',
            sorter: (a, b) => a.views - b.views, defaultSortOrder: 'descend' },
        { title: 'Sesiones únicas', dataIndex: 'uniqueSessions', key: 'uniqueSessions', width: 130, align: 'right',
            sorter: (a, b) => a.uniqueSessions - b.uniqueSessions },
    ];

    return (
        <Card title="Temas más vistos" size="small">
            <Table
                rowKey="themeId"
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

export default ThemesTable;
