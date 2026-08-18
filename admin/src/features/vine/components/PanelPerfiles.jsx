import { Card, Col, Progress, Row, Table, Tag, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { AYUDAS } from '@features/vine/constants/ayudas';

const { Text } = Typography;

const PUNTUALIDAD_BUENA = 70;

const COLUMNAS_VINCULO = [
    { title: 'Vínculo', dataIndex: 'vinculo', key: 'vinculo' },
    {
        title: 'Personas', dataIndex: 'personas', key: 'personas', align: 'right',
        render: (v, f) => (
            <>
                {v}
                {f.con_huella > 0 && (
                    <Text type="secondary" style={{ fontSize: 11 }}>{` · ${f.con_huella} con huella`}</Text>
                )}
            </>
        ),
    },
    { title: 'Días', dataIndex: 'dias', key: 'dias', align: 'right', responsive: ['md'] },
    {
        title: 'Jornadas que cierran', dataIndex: 'cobertura', key: 'cobertura', align: 'right', width: 170,
        render: (v) => (
            <Progress
                percent={v ?? 0}
                size="small"
                status={(v ?? 0) >= 95 ? 'success' : 'normal'}
                format={(p) => `${p}%`}
            />
        ),
    },
];

const COLUMNAS_HORARIO = [
    {
        title: 'Horario', dataIndex: 'nombre', key: 'nombre',
        render: (v, f) => (
            <>
                <Text strong>{v}</Text>
                {f.entrada_oficial && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {` · oficial ${f.entrada_oficial} a ${f.salida_oficial}`}
                    </Text>
                )}
            </>
        ),
    },
    { title: 'Personas', dataIndex: 'personas', key: 'personas', align: 'right' },
    {
        title: 'En la práctica', key: 'real', align: 'right', responsive: ['md'],
        render: (_, f) => (
            <Text type="secondary">{`entra ${f.entrada_mediana ?? '—'} · sale ${f.salida_mediana ?? '—'}`}</Text>
        ),
    },
    {
        title: 'Llega a tiempo', dataIndex: 'puntualidad', key: 'puntualidad', align: 'right', width: 120,
        render: (v) => (v === null || v === undefined
            ? <Text type="secondary">—</Text>
            : <Tag color={v >= PUNTUALIDAD_BUENA ? 'success' : 'warning'}>{`${v}%`}</Tag>),
    },
];

const tabla = (columnas, datos, loading) => (
    <Table
        size="small"
        rowKey={(f) => f.vinculo ?? f.horario}
        pagination={false}
        loading={loading}
        columns={columnas}
        dataSource={datos}
    />
);

const PanelPerfiles = ({ vinculos = [], horarios = [], loading }) => (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} xl={13}>
            <Card
                size="small"
                title={<TituloConAyuda titulo="Quién entra al instituto" ayuda={AYUDAS.vinculos} ancho={440} />}
            >
                {tabla(COLUMNAS_VINCULO, vinculos, loading)}
            </Card>
        </Col>
        <Col xs={24} xl={11}>
            <Card
                size="small"
                title={<TituloConAyuda titulo="Los dos horarios" ayuda={AYUDAS.horarios} ancho={440} />}
            >
                {tabla(COLUMNAS_HORARIO, horarios, loading)}
            </Card>
        </Col>
    </Row>
);

export default PanelPerfiles;
