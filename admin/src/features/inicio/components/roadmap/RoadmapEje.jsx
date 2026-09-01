import {
    ANCHO,
    ANIOS,
    CARRIL_ARRIBA,
    COLOR_PROYECTO,
    ESPINA_Y,
    FIN_PASADO,
    TRIMESTRES,
} from '@features/inicio/constants/roadmapModelo';
import { ejeX } from '@features/inicio/helpers/roadmapLayout';

const EDICIONES = [2026, 2027, 2028, 2029, 2030];

const partirNombre = (nombre, disponible) => nombre.split(' ').reduce((lineas, palabra) => {
    const ultima = lineas[lineas.length - 1];
    const probar = ultima ? `${ultima} ${palabra}` : palabra;
    if (ultima && probar.length * 8.4 > disponible) return [...lineas, palabra];
    return [...lineas.slice(0, -1), probar];
}, []);

const Banda = ({ ciclo, activo, apagado, onSeleccionar }) => {
    const y0 = ciclo.y0 || 46;
    const y1 = ciclo.y1 || 806;
    const abajo = y0 > 300;
    const lineas = partirNombre(ciclo.nombre, ciclo.x1 - ciclo.x0 - 28);
    const base = abajo ? y1 - 10 - (lineas.length - 1) * 17 - 16 : y0 + 24;

    return (
        <g
            role="button"
            tabIndex={0}
            aria-label={`Ciclo ${ciclo.nombre}`}
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onSeleccionar(ciclo.id, e); }}
            onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                const caja = e.currentTarget.getBoundingClientRect();
                onSeleccionar(ciclo.id, { clientX: caja.left + 120, clientY: caja.top + 40 });
            }}
        >
            <rect
                x={ciclo.x0} y={y0} width={ciclo.x1 - ciclo.x0} height={y1 - y0}
                fill={ciclo.tinte}
                opacity={apagado ? 0.18 : 1}
                style={{ transition: 'opacity .2s ease' }}
            />
            <line
                x1={ciclo.x1} y1={y0} x2={ciclo.x1} y2={y1}
                stroke={ciclo.color} strokeWidth={activo ? 2.5 : 1.5}
                strokeOpacity={0.35} strokeDasharray="5 4"
            />
            {lineas.map((linea, i) => (
                <text
                    key={linea} x={ciclo.x0 + 14} y={base + i * 17}
                    fill={ciclo.color} fillOpacity={0.85}
                    style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 600, letterSpacing: '.06em' }}
                >
                    {linea}
                </text>
            ))}
            <text
                x={ciclo.x0 + 14} y={base + lineas.length * 17}
                fill={ciclo.color} fillOpacity={0.5}
                style={{ fontSize: 11, fontFamily: 'monospace' }}
            >
                {ciclo.nota}
            </text>
        </g>
    );
};

const Proceso = ({ proceso, indice, opacidad, onSeleccionar, onEntrar, onSalir }) => {
    const color = COLOR_PROYECTO[proceso.proy] || COLOR_PROYECTO.infra;
    const y = CARRIL_ARRIBA[indice % CARRIL_ARRIBA.length];
    const x0 = ejeX(proceso.desde);
    const ancho = proceso.txt.length * 6.6 + 22;

    return (
        <g
            role="button"
            tabIndex={0}
            aria-label={`${proceso.txt}, proceso anual`}
            opacity={opacidad}
            style={{ cursor: 'pointer', transition: 'opacity .2s ease' }}
            onClick={(e) => { e.stopPropagation(); onSeleccionar(proceso.id, e); }}
            onMouseEnter={(e) => onEntrar(proceso.id, e)}
            onMouseLeave={onSalir}
            onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                const caja = e.currentTarget.getBoundingClientRect();
                onSeleccionar(proceso.id, { clientX: caja.left + 60, clientY: caja.bottom });
            }}
        >
            <line
                x1={x0} y1={y + 10} x2={ANCHO - 60} y2={y + 10}
                stroke={color} strokeWidth={1.5} strokeOpacity={0.25} strokeDasharray="2 6" strokeLinecap="round"
            />
            {EDICIONES.map((anio) => {
                const x = ejeX(`${anio}-${proceso.cada}`);
                if (x < x0 - 2) return null;
                return (
                    <g key={anio}>
                        <line x1={x} y1={y + 10} x2={x} y2={ESPINA_Y - 7} stroke={color} strokeWidth={1} strokeOpacity={0.3} />
                        <rect
                            x={x - 7} y={ESPINA_Y - 7} width={14} height={14} rx={2}
                            fill={anio === EDICIONES[0] ? color : '#fff'} stroke={color} strokeWidth={2.5}
                        />
                    </g>
                );
            })}
            <rect x={x0 - 6} y={y - 10} width={ancho} height={19} rx={4} fill="#fff" stroke={color} strokeWidth={1} strokeOpacity={0.35} />
            <text
                x={x0 + ancho / 2 - 6} y={y + 4} textAnchor="middle" fill={color}
                style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
            >
                {proceso.txt}
            </text>
        </g>
    );
};

export default function RoadmapEje({ ciclos, procesos, cicloActivo, opacidadProceso, onCiclo, onProceso, onEntrar, onSalir }) {
    return (
        <g>
            {ciclos.map((ciclo) => (
                <Banda
                    key={ciclo.id}
                    ciclo={ciclo}
                    activo={cicloActivo === ciclo.id}
                    apagado={Boolean(cicloActivo) && cicloActivo !== ciclo.id}
                    onSeleccionar={onCiclo}
                />
            ))}

            <line x1={60} y1={46} x2={60} y2={806} stroke="rgba(5,5,5,0.07)" strokeWidth={1} />
            {ANIOS.map((a) => (
                <g key={a.anio}>
                    <line x1={a.x1} y1={46} x2={a.x1} y2={806} stroke="rgba(5,5,5,0.07)" strokeWidth={1} />
                    <text
                        x={(a.x0 + a.x1) / 2} y={838} textAnchor="middle" fill="rgba(0,0,0,0.55)"
                        style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600, letterSpacing: '.1em' }}
                    >
                        {a.anio}
                    </text>
                    {a.anio === 2026 && Array.from({ length: 11 }, (_, i) => i + 1).map((i) => {
                        const x = a.x0 + (i / 12) * (a.x1 - a.x0);
                        return <line key={i} x1={x} y1={ESPINA_Y - 6} x2={x} y2={ESPINA_Y + 6} stroke="rgba(5,5,5,0.12)" strokeWidth={1} />;
                    })}
                </g>
            ))}

            {TRIMESTRES.map((t) => (
                <text
                    key={t.texto} x={t.x} y={ESPINA_Y + 24} textAnchor="middle" fill="rgba(0,0,0,0.3)"
                    style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '.08em' }}
                >
                    {t.texto}
                </text>
            ))}

            <line x1={60} y1={ESPINA_Y} x2={FIN_PASADO} y2={ESPINA_Y} stroke="#5C2472" strokeWidth={2.5} strokeOpacity={0.4} strokeLinecap="round" />
            <line x1={FIN_PASADO} y1={ESPINA_Y} x2={2340} y2={ESPINA_Y} stroke="#9A9AA2" strokeWidth={2} strokeOpacity={0.8} strokeDasharray="3 6" strokeLinecap="round" />

            {procesos.map((proceso, i) => (
                <Proceso
                    key={proceso.id}
                    proceso={proceso}
                    indice={i}
                    opacidad={opacidadProceso(proceso)}
                    onSeleccionar={onProceso}
                    onEntrar={onEntrar}
                    onSalir={onSalir}
                />
            ))}
        </g>
    );
}
