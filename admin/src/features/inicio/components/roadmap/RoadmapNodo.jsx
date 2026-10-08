import { SEMANTIC } from '@app/providers/brand';
import { ESPINA_Y } from '@features/inicio/constants/roadmapModelo';
import { altoDe, anchoDe, colorDe, esMuerto, logoDe, partes, tinte } from '@features/inicio/helpers/roadmapLayout';

const GRIS = 'rgba(0,0,0,0.45)';

const fondoDe = (hito, color) => {
    if (hito.tipo === 'lanzamiento') return color;
    if (hito.tipo === 'porllegar') return '#FFF6EC';
    if (esMuerto(hito)) return '#FDF1F0';
    if (hito.tipo === 'feature') return tinte(color, 0.09);
    if (hito.tipo === 'legacy') return '#F7F7F8';
    return '#fff';
};

const trazoDe = (hito) => {
    if (hito.tipo === 'porllegar') return '6 4';
    if (hito.tipo === 'joven') return '3 3';
    if (hito.tipo === 'legacy') return '2 4';
    return undefined;
};

const textoDe = (hito, color) => {
    if (hito.tipo === 'lanzamiento') return '#fff';
    if (esMuerto(hito)) return SEMANTIC.danger;
    if (hito.tipo === 'legacy') return GRIS;
    if (hito.tipo === 'feature') return color;
    return 'rgba(0,0,0,0.88)';
};

export const Momento = ({ hito, opacidad, seleccionado, onSeleccionar, onEntrar, onSalir }) => {
    const color = colorDe(hito);
    const ancho = hito.txt.length * 6.6 + 22;

    return (
        <g
            role="button"
            tabIndex={0}
            aria-label={`${hito.txt}, ${hito.fecha}`}
            opacity={opacidad}
            style={{ cursor: 'pointer', transition: 'opacity .2s ease' }}
            onClick={(e) => { e.stopPropagation(); onSeleccionar(hito.id, e); }}
            onMouseEnter={(e) => onEntrar(hito.id, e)}
            onMouseLeave={onSalir}
            onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                const caja = e.currentTarget.getBoundingClientRect();
                onSeleccionar(hito.id, { clientX: caja.left + caja.width / 2, clientY: caja.bottom });
            }}
        >
            <line x1={hito.px} y1={ESPINA_Y} x2={hito.lx} y2={hito.ly - 10} stroke={color} strokeWidth={1} strokeOpacity={0.4} />
            <rect
                x={hito.px - 9} y={ESPINA_Y - 9} width={18} height={18} rx={3}
                transform={`rotate(45 ${hito.px} ${ESPINA_Y})`}
                fill="#fff" stroke={color} strokeWidth={seleccionado ? 3.5 : 2.5}
            />
            <rect
                x={hito.lx - ancho / 2} y={hito.ly - 11} width={ancho} height={19} rx={4}
                fill="#fff" stroke={color} strokeWidth={1} strokeOpacity={seleccionado ? 1 : 0.35}
            />
            <text
                x={hito.lx} y={hito.ly + 3} textAnchor="middle" fill="rgba(0,0,0,0.6)"
                style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, letterSpacing: '.04em' }}
            >
                {hito.txt}
            </text>
        </g>
    );
};

export default function RoadmapNodo({ hito, opacidad, seleccionado, relacionado, arrastrable, onSeleccionar, onEntrar, onSalir, onArrastrar }) {
    const color = colorDe(hito);
    const borde = esMuerto(hito) ? SEMANTIC.danger : color;
    const ancho = anchoDe(hito);
    const alto = altoDe(hito);
    const lineas = partes(hito);
    const logo = logoDe(hito);
    const bajada = logo ? 12 : 0;
    const colorTexto = textoDe(hito, color);
    const grosor = ['joven', 'feature', 'legacy'].includes(hito.tipo) ? 1.5 : 2;

    return (
        <g
            role="button"
            tabIndex={hito.tipo === 'feature' ? -1 : 0}
            aria-label={`${hito.txt}, ${hito.fecha}`}
            opacity={opacidad}
            style={{
                cursor: arrastrable ? 'ew-resize' : 'pointer',
                transition: 'opacity .2s ease',
                pointerEvents: opacidad === 0 ? 'none' : 'auto',
            }}
            onPointerDown={arrastrable ? (e) => onArrastrar(hito, e) : undefined}
            onClick={(e) => { e.stopPropagation(); onSeleccionar(hito.id, e); }}
            onMouseEnter={(e) => onEntrar(hito.id, e)}
            onMouseLeave={onSalir}
            onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                const caja = e.currentTarget.getBoundingClientRect();
                onSeleccionar(hito.id, { clientX: caja.left + caja.width / 2, clientY: caja.bottom });
            }}
        >
            {(seleccionado || relacionado) && (
                <rect
                    x={hito.lx - ancho / 2 - 6} y={hito.ly - alto / 2 - 6}
                    width={ancho + 12} height={alto + 12} rx={13}
                    fill={borde} opacity={seleccionado ? 0.17 : 0.09}
                />
            )}
            <rect
                x={hito.lx - ancho / 2} y={hito.ly - alto / 2} width={ancho} height={alto} rx={8}
                fill={fondoDe(hito, color)} stroke={borde}
                strokeWidth={seleccionado ? 3.5 : grosor}
                strokeDasharray={trazoDe(hito)}
            />
            {logo && (
                <image
                    href={logo}
                    x={hito.lx - 10}
                    y={hito.ly - 22}
                    width={20}
                    height={20}
                    preserveAspectRatio="xMidYMid meet"
                />
            )}
            {lineas.length > 1 ? (
                <>
                    <text x={hito.lx} y={hito.ly - 5 + bajada} textAnchor="middle" fill={GRIS} style={{ fontSize: 10, fontFamily: 'monospace' }}>
                        {lineas[0]}
                    </text>
                    <text x={hito.lx} y={hito.ly + 12 + bajada} textAnchor="middle" fill={colorTexto} style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                        {lineas[1]}
                    </text>
                </>
            ) : (
                <>
                    {hito.antes && (
                        <text
                            x={hito.lx} y={hito.ly - 8 + bajada} textAnchor="middle" fill={GRIS}
                            style={{ fontSize: 10, fontFamily: 'monospace', textDecoration: 'line-through' }}
                        >
                            {hito.antes}
                        </text>
                    )}
                    <text
                        x={hito.lx} y={(hito.antes ? hito.ly + 12 : hito.ly + 5) + bajada} textAnchor="middle" fill={colorTexto}
                        style={{
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            textDecoration: esMuerto(hito) ? 'line-through' : undefined,
                        }}
                    >
                        {hito.txt}
                    </text>
                </>
            )}
            {hito.tipo === 'legacy' && (
                <text
                    x={hito.lx} y={hito.ly + alto / 2 + 14} textAnchor="middle" fill={GRIS}
                    style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '.12em' }}
                >
                    SEXENIOS ANTERIORES
                </text>
            )}
            {hito.beta && (
                <>
                    <rect x={hito.lx + ancho / 2 - 34} y={hito.ly - alto / 2 - 8} width={40} height={15} rx={4} fill={SEMANTIC.warning} />
                    <text
                        x={hito.lx + ancho / 2 - 14} y={hito.ly - alto / 2 + 3} textAnchor="middle" fill="#fff"
                        style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '.1em' }}
                    >
                        BETA
                    </text>
                </>
            )}
        </g>
    );
}
