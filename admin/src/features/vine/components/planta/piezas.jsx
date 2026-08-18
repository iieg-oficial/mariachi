import { COLOR_ENTRADA, COLOR_SALIDA, COLOR_SIN_LECTOR } from '@features/vine/constants';
import {
    APERTURA,
    FACHADA_Y,
    GAP,
    GROSOR_FLECHA,
    HUECO,
    LECTOR_ALTO,
    LECTOR_ANCHO,
    MURO,
    PILAR_ALTO,
    PILAR_RADIO,
    PUNTA,
    TUBO_R,
    Y,
} from './geometria';

const ARRIBA = FACHADA_Y - HUECO / 2;
const ABAJO = FACHADA_Y + HUECO / 2;

export const Reflejo = ({ x, ancho }) => (
    <g opacity={0.7}>
        <line x1={x + ancho * 0.1} y1={ABAJO - 5} x2={x + ancho * 0.34} y2={ARRIBA + 5} stroke="#FFFFFF" strokeWidth={2} />
        <line x1={x + ancho * 0.3} y1={ABAJO - 5} x2={x + ancho * 0.54} y2={ARRIBA + 5} stroke="#FFFFFF" strokeWidth={1} />
    </g>
);

export const Bisagra = ({ x, ancho }) => (
    <g>
        {[-1, 1].map((s) => (
            <g key={s}>
                <rect
                    x={x} y={FACHADA_Y + s * 9 - 2.5} width={ancho} height={5}
                    fill="#6E6E6E" rx={1.5}
                />
                <circle cx={x + ancho / 2} cy={FACHADA_Y + s * 9} r={2.6} fill="#9E9E9E" stroke="#5F5F5F" strokeWidth={0.8} />
            </g>
        ))}
    </g>
);

export const Hojas = ({ x, ancho, color }) => {
    const util = ancho - GAP * 2;
    const hoja = (util - 4) / 2;

    return (
        <g>
            <Bisagra x={x} ancho={GAP} />
            <Bisagra x={x + ancho - GAP} ancho={GAP} />
            {[0, 1].map((i) => {
                const base = x + GAP + i * (hoja + 4);
                return (
                    <g key={i}>
                        <rect
                            x={base} y={ARRIBA} width={hoja} height={HUECO}
                            fill="url(#vidrio)" stroke={color} strokeWidth={1.6} rx={2}
                        />
                        <Reflejo x={base} ancho={hoja} />
                    </g>
                );
            })}
        </g>
    );
};

const ESPESOR_HOJA = 7;

export const HojaAbatible = ({ xBisagra, largo, color }) => {
    const radianes = (APERTURA * Math.PI) / 180;
    const puntaX = xBisagra + largo * Math.cos(radianes);
    const puntaY = FACHADA_Y - largo * Math.sin(radianes);

    return (
        <g>
            <path
                d={`M ${xBisagra + largo} ${FACHADA_Y} A ${largo} ${largo} 0 0 0 ${puntaX} ${puntaY}`}
                fill="none" stroke={color} strokeWidth={1.2} strokeDasharray="4 5" opacity={0.5}
            />
            <rect
                x={xBisagra} y={FACHADA_Y - ESPESOR_HOJA / 2} width={largo} height={ESPESOR_HOJA}
                fill="none" stroke={color} strokeWidth={1} strokeDasharray="4 4" opacity={0.35} rx={2}
            />
            <g transform={`rotate(${-APERTURA} ${xBisagra} ${FACHADA_Y})`}>
                <rect
                    x={xBisagra} y={FACHADA_Y - ESPESOR_HOJA / 2} width={largo} height={ESPESOR_HOJA}
                    fill="url(#vidrio)" stroke={color} strokeWidth={1.6} rx={2}
                />
                {[0.2, 0.45, 0.7].map((f) => (
                    <line
                        key={f}
                        x1={xBisagra + largo * f} y1={FACHADA_Y + ESPESOR_HOJA / 2 - 2}
                        x2={xBisagra + largo * f + 9} y2={FACHADA_Y - ESPESOR_HOJA / 2 + 2}
                        stroke="#FFFFFF" strokeWidth={1.5} opacity={0.7}
                    />
                ))}
            </g>
            <circle cx={xBisagra} cy={FACHADA_Y} r={3.5} fill={color} />
        </g>
    );
};

export const SimboloAccesible = ({ x, y, color }) => (
    <g transform={`translate(${x - 1}, ${y + 4})`} opacity={0.45}>
        <circle cx={-8} cy={-24} r={6.5} fill={color} />
        <path
            d="M -8 -15 L -5 -3 L 9 -3" fill="none" stroke={color}
            strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M 9 -3 L 14 9" fill="none" stroke={color} strokeWidth={5.5} strokeLinecap="round" />
        <circle cx={0} cy={4} r={18} fill="none" stroke={color} strokeWidth={4} />
    </g>
);

export const Pilar = ({ x }) => (
    <g>
        <rect
            x={x} y={FACHADA_Y - PILAR_ALTO / 2} width={MURO} height={PILAR_ALTO}
            fill="#4A4A4A" rx={PILAR_RADIO}
        />
        <rect
            x={x + 3} y={FACHADA_Y - PILAR_ALTO / 2 + 3} width={MURO - 6} height={PILAR_ALTO - 6}
            fill="none" stroke="#5F5F5F" strokeWidth={1} rx={PILAR_RADIO - 3}
        />
    </g>
);

export const Tubo = ({ x }) => (
    <g>
        <circle cx={x} cy={FACHADA_Y} r={TUBO_R} fill="url(#metal)" stroke="#8C8C8C" strokeWidth={1.5} />
        <circle cx={x} cy={FACHADA_Y} r={TUBO_R - 4} fill="none" stroke="#A6A6A6" strokeWidth={1} />
    </g>
);

export const Lector = ({ xPilar, lado, entrando, apagado }) => {
    const color = apagado ? COLOR_SIN_LECTOR : (entrando ? COLOR_ENTRADA : COLOR_SALIDA);
    const x = xPilar + (lado === 'izquierdo' ? MURO * 0.28 : MURO * 0.72);
    const y = entrando
        ? FACHADA_Y - PILAR_ALTO / 2 + 5
        : FACHADA_Y + PILAR_ALTO / 2 - LECTOR_ALTO - 5;

    return (
        <g>
            <rect
                x={x - LECTOR_ANCHO / 2} y={y} width={LECTOR_ANCHO} height={LECTOR_ALTO}
                fill="#FAFAFA" stroke={color} strokeWidth={1.5} rx={1.5}
                strokeDasharray={apagado ? '2.5 2.5' : undefined}
            />
            {[0, 1, 2].map((i) => (
                <line
                    key={i}
                    x1={x - 2.2} y1={y + 4.5 + i * 3.2} x2={x + 2.2} y2={y + 4.5 + i * 3.2}
                    stroke={color} strokeWidth={1.2} opacity={apagado ? 0.5 : 0.9}
                />
            ))}
        </g>
    );
};

export const Flecha = ({ x, valor, entrando, tenue }) => {
    if (!valor && !tenue) return null;

    const grosor = tenue ? 8 : GROSOR_FLECHA;
    const [afuera, adentro] = Y.flecha;
    const desde = entrando ? afuera : adentro;
    const hasta = entrando ? adentro : afuera;
    const dir = entrando ? 1 : -1;
    const base = hasta - dir * PUNTA;
    const color = tenue ? COLOR_SIN_LECTOR : (entrando ? COLOR_ENTRADA : COLOR_SALIDA);

    return (
        <g opacity={tenue ? 0.35 : 1}>
            {tenue ? (
                <line
                    x1={x} y1={desde} x2={x} y2={base}
                    stroke={color} strokeWidth={grosor} strokeDasharray="7 6"
                />
            ) : (
                <rect
                    x={x - grosor / 2} y={Math.min(desde, base)}
                    width={grosor} height={Math.abs(base - desde)}
                    fill={color} rx={grosor / 4}
                />
            )}
            <polygon
                points={`${x - grosor / 2 - 5},${base} ${x + grosor / 2 + 5},${base} ${x},${hasta}`}
                fill={color}
            />
        </g>
    );
};
