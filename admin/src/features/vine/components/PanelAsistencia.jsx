import { Col, Empty, Row } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { getAsistenciaPersona } from '@features/vine/api/vineService';
import ChartReloj from '@features/vine/components/ChartReloj';
import ChartSemana from '@features/vine/components/ChartSemana';
import CalendarioPuntualidad from '@features/vine/components/CalendarioPuntualidad';

const PanelAsistencia = ({ fila, diaInicial, dias = 90 }) => {
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

    return (
        <>
            <div style={{ marginBottom: 12 }}>
                <ChartReloj
                    dias={datos?.dias_detalle ?? []}
                    horario={datos?.horario}
                    loading={cargando}
                    pin={fila.pin}
                    diaInicial={diaInicial}
                />
            </div>
            <Row gutter={[12, 12]}>
                <Col xs={24} lg={12}>
                    <CalendarioPuntualidad datos={datos} loading={cargando} />
                </Col>
                <Col xs={24} lg={12}>
                    <ChartSemana semana={datos?.por_dia_semana ?? []} horario={datos?.horario} loading={cargando} />
                </Col>
            </Row>
        </>
    );
};

export default PanelAsistencia;
