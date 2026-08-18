import { Card, Col, Empty, Row, Segmented, Space, Statistic, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { getAsistenciaPersona } from '@features/vine/api/vineService';
import ChartBarras from '@features/vine/components/ChartBarras';
import { COLOR_ENTRADA, COLOR_NEUTRO, RANGOS } from '@features/vine/constants';

const { Text } = Typography;

const HORARIOS = { '8-16': '8 a 4', '9-17': '9 a 5', otro: 'Sin horario fijo' };

const AYUDA_MEDIANA = 'Es la mediana, no el promedio: el valor de en medio de todos sus días. '
    + 'Se usa porque un día que llegó a las 3 de la tarde movería el promedio y la mediana no.';

const PanelAsistencia = ({ fila }) => {
    const [dias, setDias] = useState(90);
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setDatos(await getAsistenciaPersona(fila.pin, dias));
        } catch {
            setDatos(null);
        } finally {
            setCargando(false);
        }
    }, [fila.pin, dias]);

    useEffect(() => { cargar(); }, [cargar]);

    if (!cargando && !datos?.dias) {
        return <Empty description="Sin registros en el periodo" />;
    }

    const asistencia = datos?.habiles
        ? Math.min(100, Math.round((datos.dias * 100) / datos.habiles))
        : 0;
    const medibles = datos?.medibles ?? 0;

    return (
        <>
            <Space style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Periodo</Text>
                <Segmented size="small" options={RANGOS} value={dias} onChange={setDias} />
            </Space>

            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                <Col xs={12} md={6}>
                    <Card size="small" loading={cargando}>
                        <Statistic
                            title="Días que vino"
                            value={datos?.dias ?? 0}
                            suffix={`/ ${datos?.habiles ?? 0}`}
                            valueStyle={{ fontSize: 20 }}
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {`${asistencia}% de los hábiles`}
                            {datos?.justificados > 0 && ` · ${datos.justificados} justificados`}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" loading={cargando}>
                        <Statistic
                            title={<TituloConAyuda titulo="Entrada habitual" ayuda={AYUDA_MEDIANA} />}
                            value={datos?.entrada_mediana ?? '—'}
                            valueStyle={{ fontSize: 20 }}
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {`mediana de ${datos?.dias ?? 0} días · horario ${HORARIOS[fila.horario] ?? 'sin asignar'}`}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" loading={cargando}>
                        <Statistic
                            title={<TituloConAyuda titulo="Salida habitual" ayuda={AYUDA_MEDIANA} />}
                            value={datos?.salida_mediana ?? '—'}
                            valueStyle={{ fontSize: 20 }}
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {`mediana de ${medibles} días con salida`}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" loading={cargando}>
                        <Statistic
                            title={<TituloConAyuda titulo="Jornada típica" ayuda={AYUDA_MEDIANA} />}
                            value={datos?.jornada_mediana ?? 0}
                            suffix="h"
                            precision={2}
                            valueStyle={{ fontSize: 20 }}
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {`${(datos?.horas ?? 0).toLocaleString('es-MX')} h acumuladas`}
                        </Text>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[12, 12]}>
                <Col xs={24} xl={15}>
                    <ChartBarras
                        title="Cuántas horas duró cada jornada"
                        ayuda="Una barra por día con entrada y salida. Los huecos son días que no vino o que no marcó salida."
                        loading={cargando}
                        sufijo=" h"
                        series={[{ nombre: 'Horas', color: COLOR_NEUTRO }]}
                        datos={(datos?.dias_detalle ?? []).map((d) => ({
                            etiqueta: d.dia.slice(5),
                            valores: [d.horas ?? 0],
                        }))}
                    />
                </Col>
                <Col xs={24} xl={9}>
                    <ChartBarras
                        title="A qué días viene"
                        ayuda="Cuántas veces asistió en cada día de la semana dentro del periodo. Al pasar el cursor se ve la hora a la que suele entrar ese día."
                        loading={cargando}
                        sufijo=" días"
                        series={[{ nombre: 'Días que asistió', color: COLOR_ENTRADA }]}
                        datos={(datos?.por_dia_semana ?? []).map((d) => ({
                            etiqueta: `${d.nombre.slice(0, 3)} ${d.entrada_mediana ?? ''}`.trim(),
                            valores: [d.dias],
                        }))}
                    />
                </Col>
            </Row>
        </>
    );
};

export default PanelAsistencia;
