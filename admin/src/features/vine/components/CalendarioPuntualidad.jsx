import { Card, Tooltip, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { EJE_TEXTO } from '@features/vine/constants';
import { COLOR_REFERENCIA, formatoMinutos } from '@features/vine/constants/jornada';
import { fechaLarga } from '@features/vine/components/jornada/piezas';

const { Text } = Typography;

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const NOMBRES_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];

const CATEGORIAS = [
    { clave: 'a_tiempo', nombre: 'a tiempo', estilo: { background: '#DCE6F5' } },
    { clave: 'leve', nombre: 'hasta 15 min', estilo: { background: '#F6D5D9' } },
    { clave: 'retardo', nombre: 'retardo', estilo: { background: '#EBA2AC' } },
    { clave: 'mucho', nombre: 'más de 1 h', estilo: { background: '#D9707F' } },
    { clave: 'sin_horario', nombre: 'vino', estilo: { background: '#D9DEE7' } },
    { clave: 'visita', nombre: 'visita corta', estilo: { background: '#FFFFFF', boxShadow: 'inset 0 0 0 1px #3B5BA9' } },
    { clave: 'no_vino', nombre: 'no vino', estilo: { background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${COLOR_REFERENCIA}` } },
    { clave: 'incidencia', nombre: 'incidencia', estilo: { background: '#EFE7FB' }, glifo: '◆' },
    { clave: 'inhabil', nombre: 'inhábil', estilo: { background: '#F2F2F2' }, glifo: '✕' },
];

const POR_CLAVE = Object.fromEntries(CATEGORIAS.map((c) => [c.clave, c]));

const AYUDA = 'Cada cuadro es un día hábil, en columnas por semana. El color dice cómo llegó respecto a su hora '
    + 'de entrada. Sirve para ver patrones: un mismo día de la semana que se repite, o una racha.';

const categoriaDe = (d, conHorario) => {
    if (d.estado === 'inhabil') return 'inhabil';
    if (d.estado === 'incidencia') return 'incidencia';
    if (d.estado !== 'asistio') return 'no_vino';
    if (d.visita) return 'visita';
    if (!conHorario) return 'sin_horario';
    if (d.tarde > 60) return 'mucho';
    if (d.retardo) return 'retardo';
    if (d.tarde > 0) return 'leve';
    return 'a_tiempo';
};

const describir = (d, categoria) => {
    const partes = [fechaLarga(d.dia)];
    if (d.entrada) partes.push(`llegó ${d.entrada}`);
    if (d.tarde > 0 && ['leve', 'retardo', 'mucho'].includes(categoria)) partes.push(`${formatoMinutos(d.tarde)} tarde`);
    if (categoria === 'a_tiempo') partes.push('a tiempo');
    if (categoria !== 'a_tiempo' && categoria !== 'leve' && categoria !== 'retardo' && categoria !== 'mucho') {
        partes.push(d.incidencia ?? POR_CLAVE[categoria].nombre);
    }
    return partes.join(' · ');
};

const lunesDe = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    const fecha = new Date(a, m - 1, d);
    fecha.setDate(fecha.getDate() - ((fecha.getDay() + 6) % 7));
    return fecha;
};

const clave = (fecha) => `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;

const CalendarioPuntualidad = ({ datos, loading }) => {
    const conHorario = Boolean(datos?.horario?.entrada);
    const dias = datos?.calendario ?? [];
    const semanas = [];
    const indice = new Map();
    dias.forEach((d) => {
        const lunes = lunesDe(d.dia);
        const k = clave(lunes);
        if (!indice.has(k)) {
            indice.set(k, semanas.length);
            semanas.push({ lunes, dias: Array(5).fill(null) });
        }
        const [a, m, dd] = d.dia.split('-').map(Number);
        semanas[indice.get(k)].dias[(new Date(a, m - 1, dd).getDay() + 6) % 7] = d;
    });

    const rotulos = new Set();
    let ultimo = -99;
    semanas.forEach((s, i) => {
        const cambia = i === 0 || s.lunes.getMonth() !== semanas[i - 1].lunes.getMonth();
        if (cambia && i - ultimo >= 3) {
            rotulos.add(i);
            ultimo = i;
        }
    });

    const porDia = DIAS.map((_, i) => {
        const vinieron = semanas.map((s) => s.dias[i]).filter((d) => d?.estado === 'asistio' && !d.visita);
        return { i, dias: vinieron.length, retardos: vinieron.filter((d) => d.retardo).length };
    });
    const peor = conHorario
        ? porDia.filter((p) => p.dias).sort((a, b) => (b.retardos / b.dias) - (a.retardos / a.dias))[0]
        : null;
    const vino = datos?.dias_habiles ?? datos?.dias ?? 0;
    const retardos = porDia.reduce((t, p) => t + p.retardos, 0);
    const jornadas = porDia.reduce((t, p) => t + p.dias, 0);
    const usadas = new Set(dias.map((d) => categoriaDe(d, conHorario)));

    return (
        <Card
            size="small"
            title={<TituloConAyuda titulo="Calendario de puntualidad" ayuda={AYUDA} />}
            loading={loading}
            extra={!conHorario && <Text type="secondary" style={{ fontSize: 12 }}>sin horario asignado</Text>}
            style={{ height: '100%', minWidth: 0 }}
        >
            <div style={{ overflow: 'hidden' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `28px repeat(${semanas.length}, minmax(0, ${semanas.length > 20 ? '1fr' : '34px'}))`,
                    gridTemplateRows: 'auto repeat(5, auto)',
                    gap: 3,
                }}
                >
                    <span />
                    {semanas.map((s, i) => {
                        const cambia = rotulos.has(i);
                        return (
                            <span key={clave(s.lunes)} style={{ ...EJE_TEXTO, whiteSpace: 'nowrap', overflow: 'visible' }}>
                                {cambia ? MESES[s.lunes.getMonth()] : ''}
                            </span>
                        );
                    })}
                    {DIAS.map((nombre, fila) => [
                        <span key={nombre} style={{ ...EJE_TEXTO, lineHeight: '1', alignSelf: 'center' }}>{nombre}</span>,
                        ...semanas.map((s) => {
                            const d = s.dias[fila];
                            if (!d) return <span key={`${clave(s.lunes)}${fila}`} />;
                            const categoria = categoriaDe(d, conHorario);
                            const c = POR_CLAVE[categoria];
                            return (
                                <Tooltip key={d.dia} title={describir(d, categoria)}>
                                    <span style={{
                                        aspectRatio: '1',
                                        borderRadius: 3,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 9,
                                        color: 'rgba(0, 0, 0, 0.45)',
                                        cursor: 'default',
                                        ...c.estilo,
                                    }}
                                    >
                                        {c.glifo ?? ''}
                                    </span>
                                </Tooltip>
                            );
                        }),
                    ])}
                </div>
            </div>

            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 12,
            }}
            >
                {CATEGORIAS.filter((c) => usadas.has(c.clave)).map((c) => (
                    <span key={c.clave} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{
                            width: 10, height: 10, borderRadius: 2, fontSize: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...c.estilo,
                        }}
                        >
                            {c.glifo ?? ''}
                        </span>
                        <Text style={{ fontSize: 12 }}>{c.nombre}</Text>
                    </span>
                ))}
            </div>

            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 10 }}>
                {[
                    `${vino} de ${datos?.habiles ?? 0} días hábiles`,
                    conHorario && `${retardos} retardos (${jornadas ? Math.round((retardos * 100) / jornadas) : 0}%)`,
                    peor?.retardos > 0 && `más retardos los ${NOMBRES_DIA[peor.i]} (${peor.retardos} de ${peor.dias})`,
                ].filter(Boolean).join(' · ')}
            </Text>
        </Card>
    );
};

export default CalendarioPuntualidad;
