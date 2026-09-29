import { Card, Col, Empty, Row, Segmented, Space, Statistic, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { getAsistenciaPersona } from '@features/vine/api/vineService';
import ChartReloj from '@features/vine/components/ChartReloj';
import ChartSemana from '@features/vine/components/ChartSemana';
import { RANGOS } from '@features/vine/constants';

const { Text } = Typography;

const HORARIOS = { '8-16': '8 a 4', '9-17': '9 a 5', otro: 'Sin horario fijo' };

const AYUDA_MEDIANA = 'Es la mediana, no el promedio: el valor de en medio de todos sus días. '
    + 'Se usa porque un día que llegó a las 3 de la tarde movería el promedio y la mediana no.';

const PanelAsistencia = ({ fila, diaInicial }) => {
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

    const tarjetas = [
        {
            clave: 'dias',
            estadistica: { title: 'Días que vino', value: datos?.dias ?? 0, suffix: `/ ${datos?.habiles ?? 0}` },
            nota: `${asistencia}% de los hábiles${datos?.justificados > 0 ? ` · ${datos.justificados} justificados` : ''}`,
        },
        {
            clave: 'entrada',
            estadistica: {
                title: <TituloConAyuda titulo="Entrada habitual" ayuda={AYUDA_MEDIANA} />,
                value: datos?.entrada_mediana ?? '—',
            },
            nota: `mediana de ${datos?.dias ?? 0} días · horario ${datos?.horario?.nombre ?? HORARIOS[fila.horario] ?? 'sin asignar'}`,
        },
        {
            clave: 'salida',
            estadistica: {
                title: <TituloConAyuda titulo="Salida habitual" ayuda={AYUDA_MEDIANA} />,
                value: datos?.salida_mediana ?? '—',
            },
            nota: `mediana de ${medibles} días con salida`,
        },
        {
            clave: 'jornada',
            estadistica: {
                title: <TituloConAyuda titulo="Jornada típica" ayuda={AYUDA_MEDIANA} />,
                value: datos?.jornada_mediana ?? 0,
                suffix: 'h',
                precision: 2,
            },
            nota: `${(datos?.horas ?? 0).toLocaleString('es-MX')} h acumuladas`,
        },
    ];

    return (
        <>
            <Space style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Periodo</Text>
                <Segmented size="small" options={RANGOS} value={dias} onChange={setDias} />
            </Space>

            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                <Col xs={24} lg={12}>
                    <Row gutter={[8, 8]} style={{ height: '100%' }}>
                        {tarjetas.map(({ clave, ...tarjeta }) => (
                            <Col key={clave} xs={24} sm={12}>
                                <Card
                                    size="small"
                                    loading={cargando}
                                    style={{ height: '100%' }}
                                    styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' } }}
                                >
                                    <Statistic {...tarjeta.estadistica} valueStyle={{ fontSize: 18 }} />
                                    <Text type="secondary" style={{ fontSize: 11 }}>{tarjeta.nota}</Text>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Col>
                <Col xs={24} lg={12}>
                    <ChartSemana semana={datos?.por_dia_semana ?? []} horario={datos?.horario} loading={cargando} />
                </Col>
            </Row>

            <ChartReloj
                dias={datos?.dias_detalle ?? []}
                horario={datos?.horario}
                loading={cargando}
                pin={fila.pin}
                diaInicial={diaInicial}
            />
        </>
    );
};

export default PanelAsistencia;
