import { Card, Progress, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { EJE_TEXTO } from '@features/vine/constants';
import {
    COLOR_TINTA, SEGMENTOS_JORNADA, aMinutos, formatoMinutos,
} from '@features/vine/constants/jornada';
import { TARDE, fondo } from '@features/vine/components/jornada/piezas';

const { Text } = Typography;

const AYUDA = 'La barra es su día mediano: el valor de en medio de sus entradas y de sus salidas en el periodo, '
    + 'no el promedio, para que un día raro no lo mueva. Las líneas punteadas son su horario; el rayado rojo, '
    + 'lo que no cumple de él. El bigote abarca la mitad de sus días: entre más ancho, menos constante.';

const color = (clave) => fondo(SEGMENTOS_JORNADA.find((s) => s.clave === clave));

const hora = (m) => String(Math.floor(m / 60)).padStart(2, '0');

const sumar = (semana, clave) => semana.reduce((t, d) => t + (d[clave] ?? 0), 0);

const tramosDe = (entrada, salida, ofiEntrada, ofiSalida) => {
    if (entrada == null || salida == null) return [];
    if (ofiEntrada == null || ofiSalida == null) return [['dentro', entrada, salida]];
    const tramos = [];
    if (entrada < ofiEntrada) tramos.push(['antes', entrada, ofiEntrada]);
    if (entrada > ofiEntrada) tramos.push(['tarde', ofiEntrada, entrada]);
    tramos.push(['dentro', Math.max(entrada, ofiEntrada), Math.min(salida, ofiSalida)]);
    if (salida < ofiSalida) tramos.push(['tarde', salida, ofiSalida]);
    if (salida > ofiSalida) tramos.push(['despues', ofiSalida, salida]);
    return tramos.filter(([, a, b]) => b > a);
};

const diferencia = (real, oficial, antes, despues) => {
    if (real == null || oficial == null) return null;
    if (real === oficial) return 'a su hora';
    return real > oficial ? `${formatoMinutos(real - oficial)} ${despues}` : `${formatoMinutos(oficial - real)} ${antes}`;
};

const Marca = ({ posicion, valor, nota }) => {
    const orilla = posicion > 80 ? 'derecha' : posicion < 20 ? 'izquierda' : null;
    return (
        <div style={{
            position: 'absolute',
            left: `${posicion}%`,
            transform: orilla === 'derecha' ? 'translateX(-100%)' : orilla === 'izquierda' ? 'none' : 'translateX(-50%)',
            textAlign: orilla === 'derecha' ? 'right' : orilla === 'izquierda' ? 'left' : 'center',
            whiteSpace: 'nowrap',
        }}
        >
            <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
            {nota && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{nota}</Text>}
        </div>
    );
};

const Bigote = ({ desde, hasta, pct }) => (desde == null || hasta == null ? null : (
    <div style={{
        position: 'absolute',
        left: pct(desde),
        width: `calc(${pct(hasta)} - ${pct(desde)})`,
        top: 5,
        height: 8,
        borderLeft: `1.5px solid ${COLOR_TINTA}`,
        borderRight: `1.5px solid ${COLOR_TINTA}`,
    }}
    >
        <div style={{ position: 'absolute', left: 0, right: 0, top: 3, borderTop: `1.5px solid ${COLOR_TINTA}` }} />
    </div>
));

const Indicador = ({ valor, texto }) => (
    <span style={{ whiteSpace: 'nowrap' }}>
        <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{valor}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{` ${texto}`}</Text>
    </span>
);

const ResumenAsistencia = ({ datos, loading }) => {
    const horario = datos?.horario;
    const semana = datos?.por_dia_semana ?? [];
    const entrada = aMinutos(datos?.entrada_mediana);
    const salida = aMinutos(datos?.salida_mediana);
    const ofiEntrada = aMinutos(horario?.entrada);
    const ofiSalida = aMinutos(horario?.salida);
    const cuartiles = ['entrada_p25', 'entrada_p75', 'salida_p25', 'salida_p75'].map((k) => aMinutos(datos?.[k]));
    const puntos = [entrada, salida, ofiEntrada, ofiSalida, ...cuartiles].filter((v) => v != null);
    const numero = (m) => ((m - rango[0]) / (rango[1] - rango[0])) * 100;
    const rango = puntos.length
        ? [Math.floor((Math.min(...puntos) - 45) / 60) * 60, Math.ceil((Math.max(...puntos) + 45) / 60) * 60]
        : [420, 1140];
    const pct = (m) => `${numero(m)}%`;
    const constancia = datos?.entrada_p25 && datos?.salida_p25
        ? `La mitad de sus días entra de ${datos.entrada_p25} a ${datos.entrada_p75} y sale de ${datos.salida_p25} a ${datos.salida_p75}.`
        : null;
    const horas = [];
    for (let m = rango[0]; m <= rango[1]; m += 60) horas.push(m);
    const tramos = tramosDe(entrada, salida, ofiEntrada, ofiSalida);

    const vino = datos?.dias_habiles ?? datos?.dias ?? 0;
    const extra = (datos?.dias ?? 0) - vino;
    const asistencia = datos?.habiles ? Math.min(100, Math.round((vino * 100) / datos.habiles)) : 0;
    const jornadas = sumar(semana, 'dias') - sumar(semana, 'visitas');
    const retardos = sumar(semana, 'retardos');
    const sinCerrar = sumar(semana, 'sin_cerrar');
    const conAfuera = semana.filter((d) => d.afuera_promedio != null);
    const afuera = conAfuera.length
        ? Math.round(conAfuera.reduce((t, d) => t + (d.afuera_promedio * d.dias), 0) / Math.max(1, sumar(conAfuera, 'dias')))
        : null;
    const conHorario = ofiEntrada != null && ofiSalida != null;

    return (
        <Card
            size="small"
            title={<TituloConAyuda titulo={`Su día típico${conHorario ? ` · ${horario.nombre}` : ''}`} ayuda={AYUDA} />}
            loading={loading}
            extra={!conHorario && <Text type="secondary" style={{ fontSize: 12 }}>sin horario asignado</Text>}
            style={{
                height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column',
            }}
            styles={{
                body: {
                    flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 20, overflow: 'hidden',
                },
            }}
        >
            <div style={{ padding: '0 16px' }}>
                <div style={{ position: 'relative', height: 16 }}>
                    {horas.map((m) => (
                        <span key={m} style={{ ...EJE_TEXTO, position: 'absolute', left: pct(m), transform: 'translateX(-50%)' }}>
                            {hora(m)}
                        </span>
                    ))}
                </div>
                <div style={{ position: 'relative', height: 34, marginTop: 4 }}>
                    {horas.map((m) => (
                        <div
                            key={m}
                            style={{
                                position: 'absolute', left: pct(m), top: 0, bottom: 0, borderLeft: '1px solid rgba(0, 0, 0, 0.05)',
                            }}
                        />
                    ))}
                    {tramos.map(([tipo, a, b], i) => {
                        const inicio = i === 0 ? 4 : 0;
                        const fin = i === tramos.length - 1 ? 4 : 0;
                        return (
                            <div
                                key={`${tipo}${a}`}
                                style={{
                                    position: 'absolute',
                                    top: 5,
                                    height: 24,
                                    left: pct(a),
                                    width: `${((b - a) / (rango[1] - rango[0])) * 100}%`,
                                    borderRadius: `${inicio}px ${fin}px ${fin}px ${inicio}px`,
                                    ...(tipo === 'tarde' ? TARDE : color(tipo)),
                                }}
                            />
                        );
                    })}
                    {[ofiEntrada, ofiSalida].filter((m) => m != null).map((m) => (
                        <div
                            key={m}
                            style={{
                                position: 'absolute', left: pct(m), top: 0, bottom: 0, borderLeft: `1.5px dashed ${COLOR_TINTA}`,
                            }}
                        />
                    ))}
                </div>
                <div style={{ position: 'relative', height: 18 }}>
                    <Bigote desde={cuartiles[0]} hasta={cuartiles[1]} pct={pct} />
                    <Bigote desde={cuartiles[2]} hasta={cuartiles[3]} pct={pct} />
                </div>
                <div style={{ position: 'relative', height: 40, marginTop: 2 }}>
                    {entrada != null && (
                        <Marca
                            posicion={numero(entrada)}
                            valor={datos.entrada_mediana}
                            nota={diferencia(entrada, ofiEntrada, 'antes', 'tarde')}
                        />
                    )}
                    {salida != null && (
                        <Marca
                            posicion={numero(salida)}
                            valor={datos.salida_mediana}
                            nota={diferencia(salida, ofiSalida, 'antes', 'después')}
                        />
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
                {constancia && <Text type="secondary" style={{ fontSize: 12 }}>{constancia}</Text>}
                <div style={{
                    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 10px',
                }}
                >
                    <Indicador valor={`${vino}/${datos?.habiles ?? 0}`} texto="días" />
                    <Progress percent={asistencia} size="small" style={{ flex: '1 1 120px', margin: 0 }} />
                    {extra > 0 && (
                        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{`+${extra} sin obligación`}</Text>
                    )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
                    <Indicador valor={datos?.jornada_mediana ? formatoMinutos(datos.jornada_mediana * 60) : '—'} texto="por jornada" />
                    {conHorario && (
                        <Indicador valor={retardos} texto={`retardos${jornadas ? ` (${Math.round((retardos * 100) / jornadas)}%)` : ''}`} />
                    )}
                    {afuera != null && <Indicador valor={formatoMinutos(afuera)} texto="afuera al día" />}
                    <Indicador valor={sinCerrar} texto="sin cerrar" />
                </div>
            </div>
        </Card>
    );
};

export default ResumenAsistencia;
