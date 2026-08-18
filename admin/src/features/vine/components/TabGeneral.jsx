import { Card, Col, Row, Statistic, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import ChartBarras from '@features/vine/components/ChartBarras';
import PlantaAccesos from '@features/vine/components/PlantaAccesos';
import { COLOR_ENTRADA, COLOR_NEUTRO, COLOR_SALIDA } from '@features/vine/constants';
import { AYUDAS } from '@features/vine/constants/ayudas';

const { Text } = Typography;

const SERIES_DIRECCION = [
    { nombre: 'Entradas', color: COLOR_ENTRADA },
    { nombre: 'Salidas', color: COLOR_SALIDA },
];

const SERIE_UNICA = (nombre) => [{ nombre, color: COLOR_NEUTRO }];

const TabGeneral = ({ resumen, ritmo, loading }) => {
    const panorama = resumen?.panorama;
    const calidad = resumen?.calidad;
    const sincro = resumen?.sincronizacion;

    const diaFlojo = (ritmo?.semanal ?? [])
        .filter((d) => d.dia_semana < 6)
        .sort((a, b) => (a.personas_promedio ?? 0) - (b.personas_promedio ?? 0))[0];

    return (
        <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic
                            title={<TituloConAyuda titulo="Jornada típica" ayuda={AYUDAS.jornadaTipica} />}
                            value={panorama?.jornada_mediana ?? 0}
                            suffix="h"
                            precision={2}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {`sobre ${panorama?.personas_huella ?? 0} personas con huella`}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic
                            title={<TituloConAyuda titulo="Personas hoy" ayuda={AYUDAS.personasHoy} />}
                            value={panorama?.activas_hoy ?? 0}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {`${panorama?.promedio_diario ?? 0} en un día hábil promedio`}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic
                            title={<TituloConAyuda titulo="Día más flojo" ayuda={AYUDAS.diaFlojo} />}
                            value={diaFlojo?.nombre ?? '—'}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {diaFlojo ? `${diaFlojo.personas_promedio} personas en promedio` : ' '}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic
                            title={<TituloConAyuda titulo="Jornada más larga" ayuda={AYUDAS.jornadaLarga} />}
                            value={panorama?.jornada_mas_larga ?? 0}
                            suffix="h"
                            precision={2}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {`${panorama?.personas_activas ?? 0} personas con registro`}
                        </Text>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} xl={14}>
                    <ChartBarras
                        title="A qué hora entra y sale la gente"
                        ayuda={AYUDAS.ritmoHorario}
                        loading={loading}
                        tabla
                        series={SERIES_DIRECCION}
                        datos={(ritmo?.horario ?? []).map((h) => ({
                            etiqueta: `${String(h.hora).padStart(2, '0')}`,
                            valores: [h.entradas, h.salidas],
                        }))}
                    />
                </Col>
                <Col xs={24} xl={10}>
                    <ChartBarras
                        title="Personas por día de la semana"
                        ayuda={AYUDAS.ritmoSemanal}
                        loading={loading}
                        sufijo=" personas"
                        series={SERIE_UNICA('Personas en promedio')}
                        datos={(ritmo?.semanal ?? []).map((d) => ({
                            etiqueta: d.nombre.slice(0, 3),
                            valores: [d.personas_promedio],
                        }))}
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                    <ChartBarras
                        title="Asistencias por mes"
                        ayuda={AYUDAS.tendencia}
                        loading={loading}
                        tabla
                        series={SERIE_UNICA('Asistencias')}
                        datos={(ritmo?.tendencia ?? []).map((m) => ({
                            etiqueta: m.mes.slice(2),
                            valores: [m.asistencias],
                        }))}
                    />
                </Col>
                <Col xs={24}>
                    <PlantaAccesos puntos={ritmo?.puntos ?? []} loading={loading} />
                </Col>
            </Row>

            <Card
                title={<TituloConAyuda titulo="Calidad del registro" ayuda={AYUDAS.calidad} />}
                size="small"
                loading={loading}
                extra={(
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {`${calidad?.porcentaje_incompletas ?? 0}% de las jornadas quedaron incompletas`}
                    </Text>
                )}
            >
                <Row gutter={[16, 16]}>
                    <Col xs={12} md={6}>
                        <Statistic title="Jornadas completas" value={calidad?.completas ?? 0} />
                    </Col>
                    <Col xs={12} md={6}>
                        <Statistic
                            title="Sin marcar salida"
                            value={calidad?.sin_salida ?? 0}
                            valueStyle={{ color: COLOR_SALIDA }}
                        />
                    </Col>
                    <Col xs={12} md={6}>
                        <Statistic title="Sin marcar entrada" value={calidad?.sin_entrada ?? 0} />
                    </Col>
                    <Col xs={12} md={6}>
                        <Statistic title="Nunca registran" value={calidad?.nunca_registran ?? 0} />
                    </Col>
                </Row>
                {calidad?.personas_incompletas > 0 && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                        {`No está repartido parejo: ${calidad.personas_incompletas} personas concentran el ${calidad.porcentaje_concentrado}% de las salidas que faltan.`}
                    </Text>
                )}
                {sincro?.ultimo_evento && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                        {`${sincro.eventos.toLocaleString('es-MX')} registros · último el ${new Date(sincro.ultimo_evento).toLocaleString('es-MX')}`}
                    </Text>
                )}
            </Card>
        </>
    );
};

export default TabGeneral;
