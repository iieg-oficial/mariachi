import { Card, Empty, Tooltip, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { EJE_TEXTO } from '@features/vine/constants';
import { COLOR_TINTA, aMinutos } from '@features/vine/constants/jornada';
import { glifoDe } from '@features/vine/components/jornada/piezas';
import ColumnaReloj from '@features/vine/components/jornada/ColumnaReloj';
import Leyenda from '@features/vine/components/jornada/Leyenda';

const { Text } = Typography;

const ALTO = 240;
const EJE = 40;

const hora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:00`;

const rangoDe = (dias, oficiales) => {
    const extremos = dias.flatMap((d) => (d.tramos ?? []).flatMap(([, a, b]) => [a, b]));
    const ini = Math.min(420, ...oficiales.map((m) => m - 60), ...extremos);
    const fin = Math.max(1080, ...oficiales.map((m) => m + 60), ...extremos);
    return [Math.floor(ini / 60) * 60, Math.ceil(fin / 60) * 60];
};

const Linea = ({ y, texto, estilo }) => (
    <div style={{ position: 'absolute', left: EJE, right: 0, top: y, pointerEvents: 'none', ...estilo }}>
        {texto && (
            <span style={{
                ...EJE_TEXTO, color: COLOR_TINTA, fontWeight: 700, position: 'absolute', left: -EJE, top: -7, width: EJE - 4, textAlign: 'right',
            }}
            >
                {texto}
            </span>
        )}
    </div>
);

const SinHorario = () => (
    <Tooltip title="Su entrada habitual no cae en 8 a 4 ni en 9 a 5, así que no hay hora contra la cual medir la llegada. Asígnale su horario en la pestaña Ficha; si no existe, dalo de alta en Catálogos.">
        <Text type="secondary" style={{ fontSize: 12 }}>sin horario asignado</Text>
    </Tooltip>
);

const ChartReloj = ({ dias = [], horario, loading }) => {
    const ayuda = horario?.entrada
        ? `Cada columna es un día en el reloj, de arriba hacia abajo. Las líneas punteadas son su horario de ${horario.entrada} a ${horario.salida}: el rojo va de su hora de entrada a su llegada; el rayado azul es lo que se sabe de una jornada que no cerró. Retardo (●): más de ${horario.tolerancia} min.`
        : 'Cada columna es un día en el reloj, de arriba hacia abajo. Sin horario fijo no hay hora contra la cual medir llegada ni tiempo extra.';
    const titulo = <TituloConAyuda titulo="Cómo se repartió cada jornada" ayuda={ayuda} />;

    if (!loading && dias.length === 0) {
        return <Card title={titulo} size="small"><Empty description="Sin datos en el periodo" /></Card>;
    }

    const oficiales = [horario?.entrada, horario?.salida].map(aMinutos).filter((v) => v != null);
    const rango = rangoDe(dias, oficiales);
    const escala = ALTO / (rango[1] - rango[0]);
    const cada = rango[1] - rango[0] > 720 ? 120 : 60;
    const horas = [];
    for (let m = rango[0]; m <= rango[1]; m += cada) horas.push(m);
    const paso = Math.ceil(dias.length / 12);

    return (
        <Card title={titulo} size="small" loading={loading} extra={oficiales.length ? null : <SinHorario />}>
            <Leyenda />
            <div style={{ position: 'relative', height: ALTO, marginBottom: 4 }}>
                {horas.map((m) => (
                    <div key={m}>
                        <span style={{
                            ...EJE_TEXTO,
                            position: 'absolute',
                            left: 0,
                            top: ((m - rango[0]) * escala) - 7,
                            visibility: oficiales.some((o) => Math.abs((o - m) * escala) < 14) ? 'hidden' : 'visible',
                        }}
                        >
                            {hora(m)}
                        </span>
                        <Linea y={(m - rango[0]) * escala} estilo={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)' }} />
                    </div>
                ))}
                <div style={{
                    position: 'absolute', left: EJE, right: 0, top: 0, bottom: 0, display: 'flex', gap: 3,
                }}
                >
                    {dias.map((d) => (
                        <ColumnaReloj key={d.dia} d={d} rango={rango} alto={ALTO} horaEntrada={horario?.entrada} />
                    ))}
                </div>
                {oficiales.map((m, i) => (
                    <Linea
                        key={m}
                        y={(m - rango[0]) * escala}
                        texto={horario?.[i === 0 ? 'entrada' : 'salida']}
                        estilo={{ borderTop: `1.5px dashed ${COLOR_TINTA}` }}
                    />
                ))}
            </div>
            <div style={{ display: 'flex', gap: 3, marginLeft: EJE }}>
                {dias.map((d, i) => (
                    <div key={d.dia} style={{ flex: '1 1 0', minWidth: 8, textAlign: 'center' }}>
                        <div style={{ ...EJE_TEXTO, color: COLOR_TINTA, height: 14, lineHeight: '14px' }}>{glifoDe(d)}</div>
                        <div style={{ ...EJE_TEXTO, whiteSpace: 'nowrap', height: 16 }}>
                            {i % paso === 0 ? d.dia.slice(5) : ' '}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default ChartReloj;
