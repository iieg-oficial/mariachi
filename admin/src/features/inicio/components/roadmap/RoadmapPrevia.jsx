import { SEMANTIC } from '@app/providers/brand';
import { COLOR_PROYECTO } from '@features/inicio/constants/roadmapModelo';
import { LOGO_PROYECTO } from '@features/inicio/constants/roadmapLogos';

const ANCHO = 340;
const CENTRO = 44;

const fondoDe = (tipo, color) => {
    if (tipo === 'lanzamiento') return color;
    if (tipo === 'porllegar') return '#FFF6EC';
    if (tipo === 'muerto') return '#FDF1F0';
    if (tipo === 'legacy') return '#F7F7F8';
    return '#fff';
};

const trazoDe = (tipo) => {
    if (tipo === 'porllegar') return '6 4';
    if (tipo === 'joven') return '3 3';
    if (tipo === 'legacy') return '2 4';
    return undefined;
};

export default function RoadmapPrevia({ item, tipo, madre, compacto }) {
    if (!item) return null;

    const color = COLOR_PROYECTO[item.proy] || COLOR_PROYECTO.infra;

    if (tipo === 'ciclos') {
        return (
            <svg width="100%" height="72" viewBox={`0 0 ${ANCHO} 72`} role="img" aria-label="Vista previa del ciclo">
                <rect x={20} y={10} width={ANCHO - 40} height={52} rx={4} fill={`${item.color || color}18`} />
                <line x1={ANCHO - 20} y1={10} x2={ANCHO - 20} y2={62} stroke={item.color || color} strokeWidth={1.5} strokeOpacity={0.35} strokeDasharray="5 4" />
                <text x={32} y={32} fill={item.color || color} fillOpacity={0.85} style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 600 }}>
                    {item.nombre || 'ciclo nuevo'}
                </text>
                <text x={32} y={50} fill={item.color || color} fillOpacity={0.5} style={{ fontSize: 11, fontFamily: 'monospace' }}>
                    {item.nota || ''}
                </text>
            </svg>
        );
    }

    if (tipo === 'procesos') {
        return (
            <svg width="100%" height="72" viewBox={`0 0 ${ANCHO} 72`} role="img" aria-label="Vista previa del proceso">
                <line x1={40} y1={52} x2={ANCHO - 20} y2={52} stroke={color} strokeWidth={2} strokeOpacity={0.35} strokeLinecap="round" />
                {[0, 1, 2, 3].map((i) => (
                    <rect
                        key={i} x={44 + i * 70} y={45} width={13} height={13} rx={2}
                        fill={i === 0 ? color : '#fff'} stroke={color} strokeWidth={2}
                    />
                ))}
                <rect x={36} y={14} width={item.txt ? item.txt.length * 6.6 + 20 : 110} height={19} rx={4} fill="#fff" stroke={color} strokeWidth={1} strokeOpacity={0.4} />
                <text x={42} y={28} fill={color} style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
                    {item.txt || 'proceso nuevo'}
                </text>
            </svg>
        );
    }

    if (compacto) {
        const c = COLOR_PROYECTO[item.proy] || COLOR_PROYECTO.infra;
        const m = item.tipo === 'muerto';
        return (
            <svg width="92" height="26" viewBox="0 0 92 26" aria-hidden="true">
                <rect
                    x={8} y={4} width={76} height={18} rx={5}
                    fill={fondoDe(item.tipo, c)} stroke={m ? SEMANTIC.danger : c}
                    strokeWidth={['joven', 'feature', 'legacy'].includes(item.tipo) ? 1.2 : 1.8}
                    strokeDasharray={trazoDe(item.tipo)}
                />
                <line x1={46} y1={22} x2={46} y2={25} stroke={c} strokeWidth={1} strokeOpacity={0.4} />
            </svg>
        );
    }

    const etiqueta = item.txt || 'hito nuevo';
    const partes = etiqueta.includes(' · ') ? etiqueta.split(' · ') : [etiqueta];
    const logo = LOGO_PROYECTO[item.proy] && item.tipo !== 'feature' ? LOGO_PROYECTO[item.proy] : null;
    const lleno = item.tipo === 'lanzamiento';
    const muerto = item.tipo === 'muerto';
    const borde = muerto ? SEMANTIC.danger : color;
    const ancho = Math.max(120, etiqueta.length * 7.9 + 26);
    const alto = logo ? 52 : (partes.length > 1 ? 42 : (item.antes ? 46 : 32));
    const bajada = logo ? 12 : 0;
    const y = CENTRO - alto / 2;

    return (
        <svg width="100%" height="100" viewBox={`0 0 ${ANCHO} 100`} role="img" aria-label="Vista previa del hito">
            <line x1={16} y1={80} x2={ANCHO - 16} y2={80} stroke="#5C2472" strokeWidth={2} strokeOpacity={0.3} strokeLinecap="round" />

            {madre && (
                <g>
                    <rect
                        x={16} y={CENTRO - 13} width={Math.min(104, madre.txt.length * 6.6 + 16)} height={26} rx={6}
                        fill="#fff" stroke={COLOR_PROYECTO[madre.proy] || COLOR_PROYECTO.infra} strokeWidth={1.4} strokeOpacity={0.7}
                    />
                    <text
                        x={16 + Math.min(104, madre.txt.length * 6.6 + 16) / 2} y={CENTRO + 4} textAnchor="middle"
                        fill="rgba(0,0,0,0.6)" style={{ fontSize: 10, fontFamily: 'monospace' }}
                    >
                        {madre.txt}
                    </text>
                    <path
                        d={`M ${16 + Math.min(104, madre.txt.length * 6.6 + 16)} ${CENTRO} Q ${ANCHO / 2 - 70} ${CENTRO - 22} ${ANCHO / 2 - ancho / 2} ${CENTRO}`}
                        fill="none" stroke={borde} strokeWidth={1.5} strokeOpacity={0.55} strokeDasharray="5 4"
                    />
                    <text
                        x={ANCHO / 2 - 74} y={CENTRO - 18} textAnchor="middle" fill={borde} fillOpacity={0.8}
                        paintOrder="stroke" stroke="#fff" strokeWidth={3}
                        style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '.05em' }}
                    >
                        {item.leyenda || 'lo sucede'}
                    </text>
                </g>
            )}

            <line x1={ANCHO / 2} y1={80} x2={ANCHO / 2} y2={y + alto} stroke={borde} strokeWidth={1.5} strokeOpacity={0.32} />
            <circle cx={ANCHO / 2} cy={80} r={4.5} fill={borde} />
            <text x={ANCHO / 2} y={96} textAnchor="middle" fill="rgba(0,0,0,0.4)" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                {item.fecha || item.f || ''}
            </text>

            <rect
                x={ANCHO / 2 - ancho / 2} y={y} width={ancho} height={alto} rx={8}
                fill={fondoDe(item.tipo, color)} stroke={borde}
                strokeWidth={['joven', 'feature', 'legacy'].includes(item.tipo) ? 1.5 : 2}
                strokeDasharray={trazoDe(item.tipo)}
            />

            {logo && <image href={logo} x={ANCHO / 2 - 10} y={CENTRO - 22} width={20} height={20} preserveAspectRatio="xMidYMid meet" />}

            {item.antes && !logo && (
                <text x={ANCHO / 2} y={CENTRO - 8} textAnchor="middle" fill="rgba(0,0,0,0.45)" style={{ fontSize: 10, fontFamily: 'monospace', textDecoration: 'line-through' }}>
                    {item.antes}
                </text>
            )}

            <text
                x={ANCHO / 2}
                y={(item.antes && !logo ? CENTRO + 12 : CENTRO + 5) + bajada}
                textAnchor="middle"
                fill={lleno ? '#fff' : (muerto ? SEMANTIC.danger : 'rgba(0,0,0,0.88)')}
                style={{
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    textDecoration: muerto ? 'line-through' : undefined,
                }}
            >
                {partes.length > 1 ? partes[1] : etiqueta}
            </text>

            {item.beta && (
                <>
                    <rect x={ANCHO / 2 + ancho / 2 - 34} y={y - 8} width={40} height={15} rx={4} fill={SEMANTIC.warning} />
                    <text x={ANCHO / 2 + ancho / 2 - 14} y={y + 3} textAnchor="middle" fill="#fff" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '.1em' }}>
                        BETA
                    </text>
                </>
            )}

            {item.tipo === 'legacy' && (
                <text x={ANCHO / 2} y={y + alto + 14} textAnchor="middle" fill="rgba(0,0,0,0.45)" style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '.12em' }}>
                    SEXENIOS ANTERIORES
                </text>
            )}
        </svg>
    );
}
