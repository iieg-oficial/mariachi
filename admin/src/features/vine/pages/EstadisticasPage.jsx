import { BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Col, Row, Segmented, Space, Statistic, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';
import { getPersonas, getResumen, getRitmo, sincronizar } from '@features/vine/api/vineService';
import ChartBarras from '@features/vine/components/ChartBarras';
import PanelPersonas from '@features/vine/components/PanelPersonas';
import { COLOR_ENTRADA, COLOR_NEUTRO, COLOR_SALIDA, RANGOS } from '@features/vine/constants';

const { Text } = Typography;

const PERMISO_PERSONAS = 'mariachi.vine_personas.view';

const SERIES_DIRECCION = [
    { nombre: 'Entradas', color: COLOR_ENTRADA },
    { nombre: 'Salidas', color: COLOR_SALIDA },
];

const SERIE_UNICA = (nombre) => [{ nombre, color: COLOR_NEUTRO }];

const EstadisticasPage = () => {
    const { can } = useAuth();
    const { message } = App.useApp();
    const verPersonas = can(PERMISO_PERSONAS);

    const [dias, setDias] = useState(30);
    const [resumen, setResumen] = useState(null);
    const [ritmo, setRitmo] = useState(null);
    const [personas, setPersonas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sincronizando, setSincronizando] = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [r, ri] = await Promise.all([getResumen(dias), getRitmo(dias)]);
            setResumen(r);
            setRitmo(ri);
            if (verPersonas) setPersonas(await getPersonas(dias));
        } catch (e) {
            setError(e?.response?.data?.detail || 'No se pudieron cargar las estadísticas');
        } finally {
            setLoading(false);
        }
    }, [dias, verPersonas]);

    useEffect(() => { cargar(); }, [cargar]);

    const onSincronizar = async () => {
        setSincronizando(true);
        try {
            const r = await sincronizar();
            message.success(`${r.eventos_nuevos} registros nuevos y ${r.personas} personas al día`);
            await cargar();
        } catch (e) {
            message.error(e?.response?.data?.detail || 'No se pudo leer el biométrico');
        } finally {
            setSincronizando(false);
        }
    };

    const panorama = resumen?.panorama;
    const calidad = resumen?.calidad;
    const sincro = resumen?.sincronizacion;

    const diaFlojo = (ritmo?.semanal ?? [])
        .filter((d) => d.dia_semana < 6)
        .sort((a, b) => (a.personas_promedio ?? 0) - (b.personas_promedio ?? 0))[0];

    return (
        <div>
            <PageHeading
                icon={<BarChartOutlined />}
                title="Estadísticas de asistencia"
                description="Derivadas de los registros de acceso del biométrico"
            />

            <Space style={{ marginBottom: 16 }}>
                <Text type="secondary">Periodo</Text>
                <Segmented
                    options={RANGOS}
                    value={dias}
                    onChange={setDias}
                />
                <Button
                    icon={<ReloadOutlined />}
                    loading={sincronizando}
                    onClick={onSincronizar}
                >
                    Sincronizar
                </Button>
            </Space>

            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic title="Jornada promedio" value={panorama?.jornada_promedio ?? 0} suffix="h" precision={2} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {`${panorama?.jornadas_completas ?? 0} jornadas completas`}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic title="Personas hoy" value={panorama?.activas_hoy ?? 0} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {`${panorama?.promedio_diario ?? 0} en un día hábil promedio`}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic title="Día más flojo" value={diaFlojo?.nombre ?? '—'} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {diaFlojo ? `${diaFlojo.personas_promedio} personas en promedio` : ' '}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic title="Jornada más larga" value={panorama?.jornada_mas_larga ?? 0} suffix="h" precision={2} />
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
                <Col xs={24} xl={14}>
                    <ChartBarras
                        title="Asistencias por mes"
                        loading={loading}
                        tabla
                        series={SERIE_UNICA('Asistencias')}
                        datos={(ritmo?.tendencia ?? []).map((m) => ({
                            etiqueta: m.mes.slice(2),
                            valores: [m.asistencias],
                        }))}
                    />
                </Col>
                <Col xs={24} xl={10}>
                    <ChartBarras
                        title="Uso de cada acceso"
                        loading={loading}
                        series={SERIES_DIRECCION}
                        datos={(ritmo?.puntos ?? []).map((p) => ({
                            etiqueta: p.punto,
                            valores: [p.entradas, p.salidas],
                        }))}
                    />
                </Col>
            </Row>

            {verPersonas && (
                <div style={{ marginBottom: 16 }}>
                    <PanelPersonas datos={personas} loading={loading} />
                </div>
            )}

            <Card title="Calidad del registro" size="small" loading={loading}>
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
                <Alert
                    type="info"
                    showIcon
                    style={{ marginTop: 12 }}
                    message={`${calidad?.porcentaje_incompletas ?? 0}% de las jornadas del periodo quedaron incompletas`}
                    description="Una jornada sin salida no se puede convertir en horas, así que queda fuera de los promedios y de los rankings."
                />
                {sincro?.ultimo_evento && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                        {`${sincro.eventos.toLocaleString('es-MX')} registros · último el ${new Date(sincro.ultimo_evento).toLocaleString('es-MX')}`}
                    </Text>
                )}
            </Card>
        </div>
    );
};

export default EstadisticasPage;
