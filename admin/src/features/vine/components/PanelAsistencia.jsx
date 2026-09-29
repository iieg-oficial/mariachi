import { Card, Col, Empty, Row, Segmented, Space, Statistic, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { getAsistenciaPersona } from '@features/vine/api/vineService';
import ChartJornadas from '@features/vine/components/ChartJornadas';
import ChartSemana from '@features/vine/components/ChartSemana';
import { RANGOS } from '@features/vine/constants';

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
                            {`mediana de ${datos?.dias ?? 0} días · horario ${datos?.horario?.nombre ?? HORARIOS[fila.horario] ?? 'sin asignar'}`}
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
                    <ChartJornadas dias={datos?.dias_detalle ?? []} horario={datos?.horario} loading={cargando} />
                </Col>
                <Col xs={24} xl={9}>
                    <ChartSemana semana={datos?.por_dia_semana ?? []} horario={datos?.horario} loading={cargando} />
                </Col>
            </Row>
        </>
    );
};

export default PanelAsistencia;
