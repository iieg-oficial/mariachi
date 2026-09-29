import { Card, Progress, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { aMinutos, formatoMinutos } from '@features/vine/constants/jornada';

const { Text } = Typography;

const AYUDA_MEDIANA = 'Es la mediana, no el promedio: el valor de en medio de todos sus días. '
    + 'Se usa porque un día que llegó a las 3 de la tarde movería el promedio y la mediana no.';

const diferencia = (real, oficial, antes, despues) => {
    const a = aMinutos(real);
    const b = aMinutos(oficial);
    if (a == null || b == null) return null;
    if (Math.abs(a - b) < 1) return 'justo a su hora';
    return a > b ? `${formatoMinutos(a - b)} ${despues}` : `${formatoMinutos(b - a)} ${antes}`;
};

const Dato = ({ titulo, ayuda, valor, nota, extra }) => (
    <div style={{ minWidth: 0 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
            {ayuda ? <TituloConAyuda titulo={titulo} ayuda={ayuda} /> : titulo}
        </Text>
        <div style={{ fontSize: 20, lineHeight: '28px', fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
        {extra}
        {nota && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{nota}</Text>}
    </div>
);

const sumar = (semana, clave) => semana.reduce((t, d) => t + (d[clave] ?? 0), 0);

const ResumenAsistencia = ({ datos, loading }) => {
    const horario = datos?.horario;
    const semana = datos?.por_dia_semana ?? [];
    const vino = datos?.dias_habiles ?? datos?.dias ?? 0;
    const extra = (datos?.dias ?? 0) - vino;
    const pct = datos?.habiles ? Math.min(100, Math.round((vino * 100) / datos.habiles)) : 0;
    const jornadas = sumar(semana, 'dias') - sumar(semana, 'visitas');
    const retardos = sumar(semana, 'retardos');
    const sinCerrar = sumar(semana, 'sin_cerrar');
    const conAfuera = semana.filter((d) => d.afuera_promedio != null);
    const afuera = conAfuera.length
        ? Math.round(conAfuera.reduce((t, d) => t + (d.afuera_promedio * d.dias), 0) / Math.max(1, sumar(conAfuera, 'dias')))
        : null;
    const jornada = datos?.jornada_mediana;

    const datosVista = [
        {
            titulo: 'Asistencia',
            valor: `${vino} / ${datos?.habiles ?? 0}`,
            extra: <Progress percent={pct} size="small" showInfo={false} style={{ margin: '2px 0' }} />,
            nota: [`${pct}% de los hábiles`, datos?.justificados > 0 && `${datos.justificados} justificados`,
                extra > 0 && `+${extra} sin obligación`].filter(Boolean).join(' · '),
        },
        {
            titulo: 'Llega',
            ayuda: AYUDA_MEDIANA,
            valor: datos?.entrada_mediana ?? '—',
            nota: horario?.entrada ? diferencia(datos?.entrada_mediana, horario.entrada, 'antes', 'tarde') : 'sin horario asignado',
        },
        {
            titulo: 'Sale',
            ayuda: AYUDA_MEDIANA,
            valor: datos?.salida_mediana ?? '—',
            nota: horario?.salida ? diferencia(datos?.salida_mediana, horario.salida, 'antes', 'después') : `${datos?.medibles ?? 0} días con salida`,
        },
        {
            titulo: 'Jornada típica',
            ayuda: AYUDA_MEDIANA,
            valor: jornada ? formatoMinutos(jornada * 60) : '—',
            nota: `${(datos?.horas ?? 0).toLocaleString('es-MX')} h en el periodo`,
        },
        {
            titulo: 'Retardos',
            valor: horario?.entrada ? retardos : '—',
            nota: horario?.entrada && jornadas ? `${Math.round((retardos * 100) / jornadas)}% de sus jornadas` : 'sin horario asignado',
        },
        {
            titulo: 'Afuera por día',
            valor: afuera != null ? formatoMinutos(afuera) : '—',
            nota: sinCerrar ? `${sinCerrar} jornadas sin cerrar` : 'todas sus jornadas cierran',
        },
    ];

    return (
        <Card size="small" title="Resumen del periodo" loading={loading} style={{ height: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '16px 20px' }}>
                {datosVista.map((d) => <Dato key={d.titulo} {...d} />)}
            </div>
        </Card>
    );
};

export default ResumenAsistencia;
