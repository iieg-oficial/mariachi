import { Card, Col, Row, Table, Tag, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { AYUDAS } from '@features/vine/constants/ayudas';
import { medioInfo } from '@features/vine/constants/medios';
import BarraReparto from '@features/vine/components/jornada/BarraReparto';
import { totalReparto } from '@features/vine/components/jornada/piezas';
import Leyenda from '@features/vine/components/jornada/Leyenda';

const etiquetaMedio = (medio) => (
    <Tag color={medioInfo(medio).color}>{medioInfo(medio).etiqueta}</Tag>
);

const { Text } = Typography;

const nombreODefault = (fila) => fila.nombre?.trim() || `Sin nombre (${fila.pin})`;

const columnasHoras = (escala) => [
    { title: '#', key: 'pos', width: 40, render: (_, __, i) => i + 1 },
    { title: 'Persona', key: 'nombre', render: (_, f) => nombreODefault(f) },
    {
        title: 'Marca', dataIndex: 'medio', key: 'medio', width: 90,
        responsive: ['lg'], render: etiquetaMedio,
    },
    {
        title: 'Cómo se repartieron',
        key: 'reparto',
        width: '32%',
        responsive: ['md'],
        render: (_, f) => <BarraReparto reparto={f.reparto} escala={escala} />,
    },
    {
        title: 'Horas',
        dataIndex: 'horas_totales',
        key: 'horas',
        align: 'right',
        render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{`${v.toLocaleString('es-MX')} h`}</span>,
    },
    {
        title: 'Días',
        dataIndex: 'dias',
        key: 'dias',
        align: 'right',
        render: (v, f) => (
            <Text type="secondary">
                {`${v} de ${f.dias_asistidos} · ${f.horas_promedio} h/día`}
            </Text>
        ),
    },
];

const COLUMNAS_INCOMPLETOS = [
    { title: 'Persona', key: 'nombre', render: (_, f) => nombreODefault(f) },
    {
        title: 'Marca', dataIndex: 'medio', key: 'medio', width: 90,
        responsive: ['lg'], render: etiquetaMedio,
    },
    {
        title: 'Días sin salida',
        dataIndex: 'sin_salida',
        key: 'sin_salida',
        align: 'right',
        render: (v, f) => `${v} de ${f.dias_asistidos}`,
    },
    {
        title: '',
        dataIndex: 'porcentaje',
        key: 'porcentaje',
        align: 'right',
        width: 70,
        render: (v) => <Tag color="orange">{`${v}%`}</Tag>,
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

const PanelPersonas = ({ datos, loading }) => {
    const incompletos = datos?.incompletos ?? [];
    const escalaHoras = Math.max(1, ...(datos?.horas ?? []).map((f) => totalReparto(f.reparto)));

    return (
        <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
                <Card
                    title={<TituloConAyuda titulo="Quién acumula más horas" ayuda={AYUDAS.ranking} />}
                    size="small"
                    extra={<Text type="secondary" style={{ fontSize: 12 }}>solo jornadas que cierran</Text>}
                >
                    <Leyenda compacta />
                    {tabla(columnasHoras(escalaHoras), datos?.horas ?? [], loading)}
                </Card>
            </Col>
            <Col xs={24} xl={12}>
                <Row gutter={[16, 16]}>
                    <Col xs={24}>
                        <Card
                            title={<TituloConAyuda titulo="Los más madrugadores" ayuda={AYUDAS.madrugadores} />}
                            size="small"
                        >
                            {tabla(COLUMNAS_MADRUGADORES, datos?.madrugadores ?? [], loading)}
                        </Card>
                    </Col>
                    <Col xs={24}>
                        <Card
                            title={<TituloConAyuda titulo="Rachas más largas" ayuda={AYUDAS.rachas} />}
                            size="small"
                        >
                            {tabla(COLUMNAS_RACHAS, datos?.rachas ?? [], loading)}
                        </Card>
                    </Col>
                </Row>
            </Col>
            {incompletos.length > 0 && (
                <Col xs={24}>
                    <Card
                        title={<TituloConAyuda titulo="Jornadas que no cierran" ayuda={AYUDAS.incompletos} ancho={440} />}
                        size="small"
                        extra={<Text type="secondary" style={{ fontSize: 12 }}>casi siempre por el medio, no por la persona</Text>}
                    >
                        {tabla(COLUMNAS_INCOMPLETOS, incompletos, loading)}
                    </Card>
                </Col>
            )}
        </Row>
    );
};

export default PanelPersonas;
