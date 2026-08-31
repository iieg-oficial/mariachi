import { useEffect, useMemo, useRef } from 'react';
import { curvaDe, controlDeCurva } from '@shared/components/nodos/latencia';
import { ALTO, ANCHO, ESPINA_Y, FIN_EJE } from '@features/inicio/constants/roadmapModelo';
import { anchoDe, bordeDelNodo, colorDe } from '@features/inicio/helpers/roadmapLayout';
import RoadmapEje from '@features/inicio/components/roadmap/RoadmapEje';
import RoadmapNodo, { Momento } from '@features/inicio/components/roadmap/RoadmapNodo';

const DURACION = 26000;
const SALTO = 700;
const TIRITEO = 900;

const sinMovimiento = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

const Linaje = ({ hito, madre, opacidad }) => {
    const color = colorDe(hito);
    const origen = { x: madre.lx + anchoDe(madre) / 2, y: madre.ly };
    const destino = { x: hito.lx - anchoDe(hito) / 2, y: hito.ly };
    const control = controlDeCurva(origen, destino);
    const medio = {
        x: 0.25 * origen.x + 0.5 * control.x + 0.25 * destino.x,
        y: 0.25 * origen.y + 0.5 * control.y + 0.25 * destino.y,
    };
    const leyenda = hito.leyenda || (hito.antes ? 'se renombra' : 'lo sucede');

    return (
        <g opacity={opacidad} style={{ transition: 'opacity .2s ease' }}>
            <path d={curvaDe(origen, destino)} fill="none" stroke={color} strokeWidth={1.8} strokeOpacity={0.55} strokeDasharray="5 4" />
            <text
                x={medio.x} y={medio.y - 6} textAnchor="middle" fill={color} fillOpacity={0.75}
                paintOrder="stroke" stroke="#fff" strokeWidth={3.5}
                style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '.06em' }}
            >
                {leyenda}
            </text>
        </g>
    );
};

export default function RoadmapLienzo({
    hitos, marcador, seleccion, familia, cicloActivo,
    opacidadDe, onSeleccionar, onCiclo, onEntrar, onSalir, onAvance,
}) {
    const marcaRef = useRef(null);
    const cuadroRef = useRef(null);
    const porId = useMemo(
        () => Object.fromEntries(hitos.map((h) => [h.id, h])),
        [hitos],
    );

    const reacciones = useMemo(
        () => hitos
            .filter((h) => h.tipo === 'lanzamiento' || h.tipo === 'muerto')
            .map((h) => ({ x: h.px, clase: h.tipo })),
        [hitos],
    );

    useEffect(() => {
        if (sinMovimiento() || !marcaRef.current) return undefined;
        let reaccion = null;

        const animar = (tiempo) => {
            const avance = (tiempo % DURACION) / DURACION;
            const x = 60 + (FIN_EJE - 60) * avance;

            const cerca = reacciones.find((r) => Math.abs(x - r.x) < 6);
            if (cerca && (!reaccion || reaccion.x !== cerca.x)) {
                reaccion = { ...cerca, desde: tiempo };
            }

            let dx = 0;
            let dy = 0;
            let giro = 0;
            if (reaccion) {
                const duracion = reaccion.clase === 'lanzamiento' ? SALTO : TIRITEO;
                const u = (tiempo - reaccion.desde) / duracion;
                if (u >= 1) {
                    reaccion = null;
                } else if (reaccion.clase === 'lanzamiento') {
                    dy = -46 * Math.sin(Math.PI * u);
                    giro = 22 * Math.sin(Math.PI * u * 2);
                } else {
                    const amortigua = 1 - u;
                    dx = Math.sin(u * 46) * 5 * amortigua;
                    dy = Math.cos(u * 39) * 3.5 * amortigua;
                    giro = Math.sin(u * 52) * 9 * amortigua;
                }
            }

            marcaRef.current.setAttribute('x', x + dx);
            marcaRef.current.setAttribute('y', ESPINA_Y + dy);
            marcaRef.current.setAttribute('transform', `rotate(${giro} ${x + dx} ${ESPINA_Y + dy})`);
            marcaRef.current.setAttribute('opacity', avance < 0.02 || avance > 0.98 ? '0' : '0.95');
            onAvance(x);
            cuadroRef.current = requestAnimationFrame(animar);
        };

        cuadroRef.current = requestAnimationFrame(animar);
        return () => cancelAnimationFrame(cuadroRef.current);
    }, [reacciones, onAvance]);

    const nodos = hitos.filter((h) => h.tipo !== 'momento');
    const momentos = hitos.filter((h) => h.tipo === 'momento');

    return (
        <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            role="img"
            aria-label="Hoja de ruta del ecosistema, de 2024 a 2030"
            style={{ display: 'block', width: ANCHO, minWidth: ANCHO, height: 'auto' }}
        >
            <RoadmapEje
                cicloActivo={cicloActivo}
                opacidadProceso={opacidadDe}
                onCiclo={onCiclo}
                onProceso={onSeleccionar}
                onEntrar={onEntrar}
                onSalir={onSalir}
            />

            {nodos.map((hito) => (
                <g key={`hilo-${hito.id}`} opacity={opacidadDe(hito)} style={{ transition: 'opacity .2s ease' }}>
                    <path
                        d={curvaDe({ x: hito.px, y: ESPINA_Y }, { x: hito.lx, y: bordeDelNodo(hito) })}
                        fill="none" stroke={colorDe(hito)} strokeWidth={1.5} strokeOpacity={0.32}
                    />
                    <circle cx={hito.px} cy={ESPINA_Y} r={4.5} fill={colorDe(hito)} />
                </g>
            ))}

            {hitos.filter((h) => h.naceDe && porId[h.naceDe]).map((hito) => (
                <Linaje key={`linaje-${hito.id}`} hito={hito} madre={porId[hito.naceDe]} opacidad={opacidadDe(hito)} />
            ))}

            {momentos.map((hito) => (
                <Momento
                    key={hito.id}
                    hito={hito}
                    opacidad={opacidadDe(hito)}
                    seleccionado={seleccion === hito.id}
                    onSeleccionar={onSeleccionar}
                    onEntrar={onEntrar}
                    onSalir={onSalir}
                />
            ))}

            {nodos.map((hito) => (
                <RoadmapNodo
                    key={hito.id}
                    hito={hito}
                    opacidad={opacidadDe(hito)}
                    seleccionado={seleccion === hito.id}
                    relacionado={Boolean(familia) && seleccion !== hito.id && (hito.de || hito.proy) === familia}
                    onSeleccionar={onSeleccionar}
                    onEntrar={onEntrar}
                    onSalir={onSalir}
                />
            ))}

            <text
                ref={marcaRef} x={60} y={ESPINA_Y} textAnchor="middle" dominantBaseline="central"
                opacity={0} style={{ fontSize: 26 }}
            >
                {marcador}
            </text>
        </svg>
    );
}
