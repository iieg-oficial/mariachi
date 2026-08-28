import { useEffect, useRef, useState } from 'react';
import { Button, Empty, Grid, Space, Typography } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { BRAND, SEMANTIC } from '@app/providers/brand';
import { colorArista, curvaDe, duracionTravesia, puntoEnCurva } from '@shared/components/nodos/latencia';
import { NODO_INTERNET } from '@shared/services/nodosService';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const etiquetaArista = (arista) => {
    if (arista.publica) return ':80 · :443';
    if (arista.estado !== 'ok') return 'sin respuesta';
    return `${arista.ms ?? '—'} ms`;
};

const ANCHO_BASE = 900;
const ZOOM_MINIMO = 1;
const ZOOM_MAXIMO = 3;
const PASO_ZOOM = 0.5;

const bordeDeNodo = (nodo, esInternet) => {
    if (esInternet) return SEMANTIC.neutral;
    if (nodo.aislado) return BRAND.orange;
    if (nodo.status === 'ok' || nodo.status === 'degraded') return BRAND.purple;
    return SEMANTIC.neutral;
};

const centro = (nodo) => ({ x: nodo.x + nodo.w / 2, y: nodo.y + nodo.h / 2 });

const usaMovimiento = () => {
    const consulta = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    return !consulta?.matches;
};

export default function MapaNodos({ nodos, aristas, onSeleccionar }) {
    const svgRef = useRef(null);
    const cuadroRef = useRef(null);
    const pantalla = useBreakpoint();
    const compacto = !pantalla.md;
    const [zoom, setZoom] = useState(1);

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
                const punto = puntoEnCurva(p.origen, p.destino, t);
                p.circulo.setAttribute('cx', punto.x);
                p.circulo.setAttribute('cy', punto.y);
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

    const lienzo = (
        <svg
            ref={svgRef}
            viewBox="0 0 900 470"
            role="img"
            aria-label="Mapa de los nodos del ecosistema y sus enlaces"
            style={{
                display: 'block',
                width: compacto ? ANCHO_BASE * zoom : '100%',
                height: 'auto',
                minWidth: compacto ? ANCHO_BASE : undefined,
            }}
        >
            {aristas.map((arista, indice) => {
                const origen = centro(porId[arista.de]);
                const destino = centro(porId[arista.a]);
                const color = colorArista(arista);
                return (
                    <g key={`${arista.de}-${arista.a}`}>
                        <path
                            d={curvaDe(origen, destino)}
                            fill="none"
                            stroke={color} strokeWidth={2} strokeOpacity={0.35}
                            strokeDasharray={arista.estado === 'ok' ? undefined : '7 5'}
                        />
                        <text
                            x={puntoEnCurva(origen, destino, 0.5).x}
                            y={puntoEnCurva(origen, destino, 0.5).y - 8}
                            textAnchor="middle" fill={color}
                            style={{ fontSize: 10, fontFamily: 'monospace' }}
                        >
                            {etiquetaArista(arista)}
                        </text>
                        {arista.estado === 'ok' && (
                            <circle r={4.5} fill={color} opacity={0} data-arista={indice} />
                        )}
                    </g>
                );
            })}

            {nodos.map((nodo) => {
                const esInternet = nodo.node === NODO_INTERNET;
                const borde = bordeDeNodo(nodo, esInternet);
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
                            x={nodo.x} y={nodo.y} width={nodo.w} height={nodo.h} rx={esInternet ? 33 : 10}
                            fill={esInternet ? '#fafafa' : '#fff'} stroke={borde} strokeWidth={2}
                            strokeDasharray={nodo.aislado || esInternet ? '6 4' : undefined}
                        />
                        <text x={nodo.x + nodo.w / 2} y={esInternet ? nodo.y + 29 : nodo.y + 26} textAnchor="middle"
                            style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                            {esInternet ? 'Internet' : nodo.node}
                        </text>
                        {esInternet ? (
                            <text x={nodo.x + nodo.w / 2} y={nodo.y + 47} textAnchor="middle"
                                fill="rgba(0,0,0,0.45)" style={{ fontSize: 10 }}>
                                {nodo.dominio || 'entrada pública'}
                            </text>
                        ) : (
                            <>
                                <text x={nodo.x + nodo.w / 2} y={nodo.y + 43} textAnchor="middle"
                                    fill="rgba(0,0,0,0.45)" style={{ fontSize: 10 }}>
                                    {servicios.length > 2 ? `${servicios.length} servicios` : servicios.map((s) => s.slug).join(' · ')}
                                </text>
                                <text x={nodo.x + nodo.w / 2} y={nodo.y + 61} textAnchor="middle"
                                    fill="rgba(0,0,0,0.45)" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                                    {nodo.host?.memory_used_percent != null ? `RAM ${nodo.host.memory_used_percent}% · ` : ''}
                                    {`${nodo.containers?.running ?? 0}/${nodo.containers?.total ?? 0}`}
                                </text>
                            </>
                        )}
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

    if (!compacto) return lienzo;

    return (
        <div>
            <Space size={4} style={{ marginBottom: 8 }}>
                <Button
                    size="small"
                    icon={<MinusOutlined />}
                    aria-label="Alejar el mapa"
                    disabled={zoom <= ZOOM_MINIMO}
                    onClick={() => setZoom((z) => Math.max(ZOOM_MINIMO, z - PASO_ZOOM))}
                />
                <Button
                    size="small"
                    icon={<PlusOutlined />}
                    aria-label="Acercar el mapa"
                    disabled={zoom >= ZOOM_MAXIMO}
                    onClick={() => setZoom((z) => Math.min(ZOOM_MAXIMO, z + PASO_ZOOM))}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>{`${zoom}x`}</Text>
            </Space>
            <div style={{ overflow: 'auto', maxHeight: '60dvh', WebkitOverflowScrolling: 'touch' }}>
                {lienzo}
            </div>
        </div>
    );
}

