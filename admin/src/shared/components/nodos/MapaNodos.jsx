import { useEffect, useRef } from 'react';
import { Empty, Typography } from 'antd';
import { SEMANTIC } from '@app/providers/brand';
import { colorArista, duracionTravesia } from '@shared/components/nodos/latencia';

const { Text } = Typography;

const COLOR_ESTADO = {
    ok: SEMANTIC.success,
    degraded: SEMANTIC.warning,
    down: SEMANTIC.danger,
};

const colorDe = (estado) => COLOR_ESTADO[estado] || SEMANTIC.neutral;

const centro = (nodo) => ({ x: nodo.x + nodo.w / 2, y: nodo.y + nodo.h / 2 });

const usaMovimiento = () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function MapaNodos({ nodos, aristas, onSeleccionar }) {
    const svgRef = useRef(null);
    const cuadroRef = useRef(null);

    useEffect(() => {
        if (!usaMovimiento() || !aristas.length || !svgRef.current) return undefined;

        const porId = Object.fromEntries(nodos.map((n) => [n.node, n]));
        const paquetes = Array.from(svgRef.current.querySelectorAll('[data-arista]'))
            .map((circulo) => {
                const arista = aristas[Number(circulo.dataset.arista)];
                if (!arista || !porId[arista.de] || !porId[arista.a]) return null;
                const origen = centro(porId[arista.de]);
                const destino = centro(porId[arista.a]);
                return {
                    circulo,
                    origen,
                    destino,
                    duracion: duracionTravesia(origen, destino, arista.ms),
                    desfase: Number(circulo.dataset.arista) * 320,
                };
            })
            .filter(Boolean);

        const animar = (tiempo) => {
            paquetes.forEach((p) => {
                const t = ((tiempo + p.desfase) % p.duracion) / p.duracion;
                p.circulo.setAttribute('cx', p.origen.x + (p.destino.x - p.origen.x) * t);
                p.circulo.setAttribute('cy', p.origen.y + (p.destino.y - p.origen.y) * t);
                p.circulo.setAttribute('opacity', t < 0.08 || t > 0.92 ? '0' : '0.95');
            });
            cuadroRef.current = requestAnimationFrame(animar);
        };

        cuadroRef.current = requestAnimationFrame(animar);
        return () => cancelAnimationFrame(cuadroRef.current);
    }, [aristas, nodos]);

    if (!nodos.length) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="El monitor no reportó nodos" />;
    }

    const porId = Object.fromEntries(nodos.map((n) => [n.node, n]));

    return (
        <svg
            ref={svgRef}
            viewBox="0 0 900 470"
            role="img"
            aria-label="Mapa de los nodos del ecosistema y sus enlaces"
            style={{ display: 'block', width: '100%', height: 'auto' }}
        >
            {aristas.map((arista, indice) => {
                const origen = centro(porId[arista.de]);
                const destino = centro(porId[arista.a]);
                const color = colorArista(arista);
                return (
                    <g key={`${arista.de}-${arista.a}`}>
                        <line
                            x1={origen.x} y1={origen.y} x2={destino.x} y2={destino.y}
                            stroke={color} strokeWidth={2} strokeOpacity={0.35}
                            strokeDasharray={arista.estado === 'ok' ? undefined : '7 5'}
                        />
                        <text
                            x={(origen.x + destino.x) / 2} y={(origen.y + destino.y) / 2 - 9}
                            textAnchor="middle" fill={color}
                            style={{ fontSize: 10, fontFamily: 'monospace' }}
                        >
                            {arista.estado === 'ok' ? `${arista.ms ?? '—'} ms` : 'sin respuesta'}
                        </text>
                        {arista.estado === 'ok' && (
                            <circle r={4.5} fill={color} opacity={0} data-arista={indice} />
                        )}
                    </g>
                );
            })}

            {nodos.map((nodo) => {
                const borde = colorDe(nodo.status);
                const servicios = nodo.servicios || [];
                return (
                    <g
                        key={nodo.node}
                        tabIndex={0}
                        role="button"
                        aria-label={`${nodo.node}: ${nodo.rol || ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onSeleccionar(nodo)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSeleccionar(nodo);
                            }
                        }}
                    >
                        <rect
                            x={nodo.x} y={nodo.y} width={nodo.w} height={nodo.h} rx={10}
                            fill="#fff" stroke={borde} strokeWidth={2}
                            strokeDasharray={nodo.aislado ? '6 4' : undefined}
                        />
                        <text x={nodo.x + nodo.w / 2} y={nodo.y + 26} textAnchor="middle"
                            style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                            {nodo.node}
                        </text>
                        <text x={nodo.x + nodo.w / 2} y={nodo.y + 43} textAnchor="middle"
                            fill="rgba(0,0,0,0.45)" style={{ fontSize: 10 }}>
                            {servicios.length > 2 ? `${servicios.length} servicios` : servicios.map((s) => s.slug).join(' · ')}
                        </text>
                        <text x={nodo.x + nodo.w / 2} y={nodo.y + 61} textAnchor="middle"
                            fill="rgba(0,0,0,0.45)" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                            {nodo.host?.memory_used_percent != null ? `RAM ${nodo.host.memory_used_percent}% · ` : ''}
                            {`${nodo.containers?.running ?? 0}/${nodo.containers?.total ?? 0}`}
                        </text>
                        {(nodo.aislado || nodo.soloProxmox) && (
                            <text x={nodo.x + nodo.w / 2} y={nodo.y + nodo.h + 15} textAnchor="middle"
                                fill={SEMANTIC.warning} style={{ fontSize: 9, fontFamily: 'monospace' }}>
                                {nodo.aislado ? 'LAN aislada' : 'solo en Proxmox'}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

