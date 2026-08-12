import { Card, Col, Row, Table, Tag, Typography } from 'antd';

const { Text } = Typography;

const nombreODefault = (fila) => fila.nombre?.trim() || `Sin nombre (${fila.pin})`;

const COLUMNAS_HORAS = [
    { title: '#', key: 'pos', width: 40, render: (_, __, i) => i + 1 },
    { title: 'Persona', key: 'nombre', render: (_, f) => nombreODefault(f) },
    { title: 'Área', dataIndex: 'departamento', key: 'departamento', responsive: ['lg'] },
    {
        title: 'Horas',
        dataIndex: 'horas_totales',
        key: 'horas',
        align: 'right',
        render: (v) => `${v.toLocaleString('es-MX')} h`,
    },
    {
        title: 'Días',
        dataIndex: 'dias',
        key: 'dias',
        align: 'right',
        render: (v, f) => <Text type="secondary">{`${v} · ${f.horas_promedio} h/día`}</Text>,
    },
];

const COLUMNAS_MADRUGADORES = [
    { title: '#', key: 'pos', width: 40, render: (_, __, i) => i + 1 },
    { title: 'Persona', key: 'nombre', render: (_, f) => nombreODefault(f) },
    {
        title: 'Entrada habitual',
        dataIndex: 'entrada_mediana',
        key: 'entrada',
        align: 'right',
        render: (v) => <Tag color="blue">{v}</Tag>,
    },
    { title: 'Días', dataIndex: 'dias', key: 'dias', align: 'right' },
];

const COLUMNAS_RACHAS = [
    { title: '#', key: 'pos', width: 40, render: (_, __, i) => i + 1 },
    { title: 'Persona', key: 'nombre', render: (_, f) => nombreODefault(f) },
    {
        title: 'Días hábiles seguidos',
        dataIndex: 'racha',
        key: 'racha',
        align: 'right',
        render: (v) => <Tag color="orange">{v}</Tag>,
    },
];

const tabla = (columnas, datos, loading) => (
    <Table
        size="small"
        rowKey="pin"
        pagination={false}
        loading={loading}
        columns={columnas}
        dataSource={datos}
    />
);

const PanelPersonas = ({ datos, loading }) => (
    <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
            <Card
                title="Quién acumula más horas"
                size="small"
                extra={<Text type="secondary" style={{ fontSize: 12 }}>solo jornadas completas</Text>}
            >
                {tabla(COLUMNAS_HORAS, datos?.horas ?? [], loading)}
            </Card>
        </Col>
        <Col xs={24} xl={12}>
            <Row gutter={[16, 16]}>
                <Col xs={24}>
                    <Card title="Los más madrugadores" size="small">
                        {tabla(COLUMNAS_MADRUGADORES, datos?.madrugadores ?? [], loading)}
                    </Card>
                </Col>
                <Col xs={24}>
                    <Card title="Rachas más largas" size="small">
                        {tabla(COLUMNAS_RACHAS, datos?.rachas ?? [], loading)}
                    </Card>
                </Col>
            </Row>
        </Col>
    </Row>
);

export default PanelPersonas;
