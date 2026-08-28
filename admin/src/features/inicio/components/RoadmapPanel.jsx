import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Space, Typography } from 'antd';
import { SEMANTIC } from '@app/providers/brand';
import { FlagOutlined } from '@ant-design/icons';
import SectionHeader from '@shared/components/SectionHeader';
import { CICLOS, MARCADORES, PROCESOS } from '@features/inicio/constants/roadmapModelo';
import { HITOS } from '@features/inicio/constants/roadmapHitos';
import { acomodar, colorDe, esMuerto } from '@features/inicio/helpers/roadmapLayout';
import RoadmapLienzo from '@features/inicio/components/roadmap/RoadmapLienzo';

const { Text } = Typography;

const CATALOGO = [...HITOS, ...CICLOS, ...PROCESOS];

const buscar = (id) => CATALOGO.find((item) => item.id === id) || null;

export default function RoadmapPanel() {
    const [seleccion, setSeleccion] = useState(null);
    const [fijado, setFijado] = useState(false);
    const [tip, setTip] = useState(null);
    const [seguir, setSeguir] = useState(true);
    const cajaRef = useRef(null);
    const marcoRef = useRef(null);
    const esperadoRef = useRef(-1);

    const hitos = useMemo(() => acomodar(HITOS), []);

    const activo = seleccion ? buscar(seleccion) : null;
    const esCiclo = Boolean(activo && activo.x0 != null);
    const familia = activo && !esCiclo ? (activo.de || activo.proy) : null;

    const opacidadDe = useCallback((hito) => {
        const suyo = (hito.de || hito.proy) === familia;
        if (hito.tipo === 'feature') return suyo ? 1 : 0;
        if (!familia) return 1;
        return suyo ? 1 : 0.18;
    }, [familia]);

    const situarTip = (id, evento) => {
        const item = buscar(id);
        if (!item || !marcoRef.current) return;
        const marco = marcoRef.current.getBoundingClientRect();
        setTip({
            item,
            x: Math.min(Math.max(evento.clientX - marco.left + 14, 8), marco.width - 340),
            y: Math.max(8, evento.clientY - marco.top + 16),
        });
    };

    const alEntrar = (id, evento) => {
        if (fijado) return;
        setSeleccion(id);
        situarTip(id, evento);
    };

    const alSalir = () => {
        if (fijado) return;
        setSeleccion(null);
        setTip(null);
    };

    const alSeleccionar = (id, evento) => {
        if (fijado && seleccion === id) {
            setFijado(false);
            setSeleccion(null);
            setTip(null);
            return;
        }
        setFijado(true);
        setSeleccion(id);
        if (evento) situarTip(id, evento);
    };

    const alAvanzar = useCallback((x) => {
        const caja = cajaRef.current;
        if (!seguir || !caja) return;
        const destino = Math.max(0, Math.min(x - caja.clientWidth / 2, caja.scrollWidth - caja.clientWidth));
        esperadoRef.current = destino;
        caja.scrollLeft = destino;
    }, [seguir]);

    const alDesplazar = () => {
        const caja = cajaRef.current;
        if (!seguir || !caja) return;
        if (Math.abs(caja.scrollLeft - esperadoRef.current) < 2) return;
        setSeguir(false);
    };

    const limpiar = useCallback(() => {
        setFijado(false);
        setSeleccion(null);
        setTip(null);
    }, []);

    useEffect(() => {
        if (!fijado) return undefined;
        document.addEventListener('click', limpiar);
        return () => document.removeEventListener('click', limpiar);
    }, [fijado, limpiar]);

    const colorTip = tip && (tip.item.color || (esMuerto(tip.item) ? SEMANTIC.danger : colorDe(tip.item)));

    return (
        <div>
            <SectionHeader
                icon={<FlagOutlined />}
                title="Hoja de ruta"
                subtitle="El ecosistema de 2024 a 2030"
                badge={(
                    <Button
                        size="small"
                        type={seguir ? 'primary' : 'default'}
                        onClick={(e) => { e.stopPropagation(); setSeguir((v) => !v); }}
                    >
                        {seguir ? 'Siguiendo' : 'Scroll libre'}
                    </Button>
                )}
            />
            <Card size="small" styles={{ body: { padding: '6px 10px' } }}>
                <div ref={marcoRef} style={{ position: 'relative' }}>
                    <div
                        ref={cajaRef}
                        onScroll={alDesplazar}
                        style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
                    >
                        <RoadmapLienzo
                            hitos={hitos}
                            marcador={MARCADORES[0]}
                            seleccion={seleccion}
                            familia={familia}
                            cicloActivo={esCiclo ? seleccion : null}
                            opacidadDe={opacidadDe}
                            onSeleccionar={alSeleccionar}
                            onCiclo={alSeleccionar}
                            onEntrar={alEntrar}
                            onSalir={alSalir}
                            onAvance={alAvanzar}
                        />
                    </div>

                    {tip && (
                        <div
                            style={{
                                position: 'absolute',
                                left: tip.x,
                                top: tip.y,
                                zIndex: 5,
                                maxWidth: 320,
                                pointerEvents: 'none',
                                background: '#fff',
                                border: '1px solid rgba(5,5,5,0.1)',
                                borderRadius: 8,
                                boxShadow: '0 6px 20px -6px rgba(25,19,32,0.35)',
                                padding: '10px 12px',
                            }}
                        >
                            <Space orientation="vertical" size={2}>
                                {tip.item.antes && (
                                    <Text type="secondary" style={{ fontSize: 11, textDecoration: 'line-through' }}>
                                        {tip.item.antes}
                                    </Text>
                                )}
                                <Text strong style={{ fontSize: 15, color: colorTip }}>
                                    {tip.item.nombre || tip.item.txt}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {tip.item.fecha || tip.item.nota}
                                </Text>
                                <Text style={{ fontSize: 13 }}>{tip.item.motivo}</Text>
                            </Space>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
