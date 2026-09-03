import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Card, ConfigProvider, Spin, theme } from 'antd';
import { FlagOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import usePantallaCompleta from '@shared/hooks/usePantallaCompleta';
import SectionHeader from '@shared/components/SectionHeader';
import {
    PASO_ZOOM,
    ZOOM_MAXIMO,
    ZOOM_MINIMO,
} from '@features/inicio/constants/roadmapModelo';
import { acomodar } from '@features/inicio/helpers/roadmapLayout';
import useRoadmapHitos from '@features/inicio/hooks/useRoadmapHitos';
import useArrastreHito from '@features/inicio/hooks/useArrastreHito';
import RoadmapLienzo from '@features/inicio/components/roadmap/RoadmapLienzo';
import RoadmapModales from '@features/inicio/components/roadmap/RoadmapModales';
import RoadmapAltas from '@features/inicio/components/roadmap/RoadmapAltas';
import RoadmapTip from '@features/inicio/components/roadmap/RoadmapTip';
import RoadmapMarco from '@features/inicio/components/roadmap/RoadmapMarco';
import useAltaPorClic from '@features/inicio/hooks/useAltaPorClic';
import useSeleccionRoadmap, { tipoDe } from '@features/inicio/hooks/useSeleccionRoadmap';
import RoadmapAcciones from '@features/inicio/components/roadmap/RoadmapAcciones';

const PERMISO = 'mariachi.roadmap.manage';
const LLAVE_MARCADOR = 'roadmap-marcador';

export default function RoadmapPanel() {
    const { user } = useAuth();
    const { message } = App.useApp();
    const noSePudo = useCallback(
        () => message.error('El navegador no permitió la pantalla completa'),
        [message],
    );
    const {
        marcoRef,
        activa: pantallaCompleta,
        alternar: alternarPantalla,
    } = usePantallaCompleta(noSePudo);
    const [editando, setEditando] = useState(false);
    const { datos, ciclos, procesos, cargando, guardando, guardar, agregar, eliminar } = useRoadmapHitos();
    const [marcador, setMarcador] = useState(() => {
        try {
            const guardado = window.localStorage.getItem(LLAVE_MARCADOR);
            return guardado ? JSON.parse(guardado) : null;
        } catch {
            return null;
        }
    });

    const elegirMarcador = useCallback((simbolo) => {
        setMarcador(simbolo);
        try {
            window.localStorage.setItem(LLAVE_MARCADOR, JSON.stringify(simbolo));
        } catch {
            /* sin memoria en este navegador */
        }
    }, []);
    const [pausado, setPausado] = useState(false);
    const [verOcultos, setVerOcultos] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [verMarcador, setVerMarcador] = useState(false);
    const cajaRef = useRef(null);
    const svgRef = useRef(null);

    const {
        seleccion, setSeleccion, fijado, setFijado, tip, setTip, tipRef,
        verFormulario, setVerFormulario,
        activo, esCiclo, relacionados, limpiar, situarTip,
    } = useSeleccionRoadmap({ datos, ciclos, procesos, marcoRef });
    const esperadoRef = useRef(-1);

    const puedeEditar = Boolean(user?.permissions?.includes?.(PERMISO));






    const seguirRef = useRef(true);

    const opacidadDe = useCallback((hito) => {
        const suyo = relacionados.has(hito.id);
        if (hito.tipo === 'feature' && !suyo) return verOcultos ? 0.45 : 0;
        if (!relacionados.size) return 1;
        return suyo ? 1 : 0.18;
    }, [relacionados, verOcultos]);


    const alEntrar = (id, evento) => {
        if (fijado || editando) return;
        setSeleccion(id);
        situarTip(id, evento);
    };

    const alSalir = () => {
        if (fijado || editando) return;
        setSeleccion(null);
        setTip(null);
    };

    const alSeleccionar = (id, evento) => {
        if (fijado && seleccion === id) {
            limpiar();
            return;
        }
        setFijado(true);
        setSeleccion(id);
        if (editando) {
            setVerFormulario(true);
            return;
        }
        if (evento) situarTip(id, evento);
        else setTip(null);
    };

    const { arrastre, arrastrar } = useArrastreHito(
        svgRef,
        useCallback((hito) => guardar('hitos', hito), [guardar]),
    );

    const hitos = useMemo(() => acomodar(
        arrastre ? datos.map((h) => (h.id === arrastre.id ? { ...h, f: arrastre.fecha } : h)) : datos,
    ), [datos, arrastre]);


    const alGuardar = async (valores) => {
        await guardar(tipoDe(activo), { ...activo, ...valores });
        setVerFormulario(false);
        limpiar();
    };


    const crearEn = useCallback(async (tipo, extra) => {
        const clave = await agregar(tipo, extra);
        if (!clave) return;
        setSeleccion(clave);
        setFijado(true);
        setVerFormulario(true);
    }, [agregar, setSeleccion, setFijado, setVerFormulario]);

    const alDobleClic = useAltaPorClic(svgRef, ciclos, crearEn);




    const alEliminar = async (clave) => {
        await eliminar(tipoDe(activo), clave);
        limpiar();
    };

    const alAvanzar = useCallback((x, enPausa) => {
        const caja = cajaRef.current;
        if (enPausa || !seguirRef.current || !caja) return;
        const destino = Math.max(0, Math.min(x - caja.clientWidth / 2, caja.scrollWidth - caja.clientWidth));
        esperadoRef.current = destino;
        caja.scrollLeft = destino;
    }, []);

    const alDesplazar = () => {
        const caja = cajaRef.current;
        if (!seguirRef.current || !caja) return;
        if (Math.abs(caja.scrollLeft - esperadoRef.current) < 2) return;
        seguirRef.current = false;
    };

    const ajustarZoom = useCallback((paso) => {
        setZoom((z) => Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, Number((z + paso).toFixed(2)))));
    }, []);

    useEffect(() => {
        if (!pantallaCompleta) setZoom(1);
    }, [pantallaCompleta]);

    const alRodar = (evento) => {
        if (!pantallaCompleta) return;
        evento.preventDefault();
        ajustarZoom(evento.deltaY > 0 ? -PASO_ZOOM : PASO_ZOOM);
    };

    const alternarEdicion = async () => {
        if (editando) {
            setEditando(false);
            limpiar();
            if (document.fullscreenElement) await alternarPantalla();
            return;
        }
        setEditando(true);
        limpiar();
        if (!pantallaCompleta) await alternarPantalla();
    };

    const estabaCompleta = useRef(false);

    useEffect(() => {
        if (estabaCompleta.current && !pantallaCompleta) {
            setEditando(false);
            limpiar();
        }
        estabaCompleta.current = pantallaCompleta;
    }, [pantallaCompleta, limpiar]);

    const alternarPausa = () => {
        seguirRef.current = pausado;
        setPausado((v) => !v);
    };






    const acciones = (
        <RoadmapAcciones
            verOcultos={verOcultos}
            pausado={pausado}
            pantallaCompleta={pantallaCompleta}
            editando={editando}
            puedeEditar={puedeEditar}
            zoom={zoom}
            onZoom={ajustarZoom}
            onVerOcultos={() => setVerOcultos((v) => !v)}
            onPausa={alternarPausa}
            onPantalla={alternarPantalla}
            onEditar={alternarEdicion}
        />
    );

    return (
        <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
            <div style={{ colorScheme: 'light' }}>
                <SectionHeader
                    icon={<FlagOutlined />}
                    title="Hoja de ruta"
                    subtitle="El ecosistema de 2024 a 2030"
                    acciones={!pantallaCompleta && acciones}
                />
                <Card size="small" styles={{ body: { padding: '6px 10px' } }}>
                    {cargando && (
                        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                    )}
                    <RoadmapMarco marcoRef={marcoRef} cargando={cargando} pantallaCompleta={pantallaCompleta}>
                        {pantallaCompleta && (
                            <div style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 6,
                                display: 'flex',
                                justifyContent: 'flex-end',
                                padding: '6px 4px 12px',
                                background: '#fff',
                            }}>
                                {acciones}
                            </div>
                        )}
                        <div
                            ref={cajaRef}
                            onScroll={alDesplazar}
                            onWheel={alRodar}
                            style={{
                                overflow: 'auto',
                                WebkitOverflowScrolling: 'touch',
                                flex: pantallaCompleta ? '1 1 auto' : 'none',
                                minHeight: 0,
                                display: pantallaCompleta ? 'flex' : 'block',
                            }}
                        >
                            <RoadmapLienzo
                                hitos={hitos}
                                ciclos={ciclos}
                                procesos={procesos}
                                editando={editando}
                                arrastre={arrastre}
                                onDobleClic={alDobleClic}
                                svgRef={svgRef}
                                onArrastrar={arrastrar}
                                marcador={marcador}
                                seleccion={seleccion}
                                relacionados={relacionados}
                                pausado={pausado}
                                aAlto={pantallaCompleta}
                                zoom={zoom}
                                cicloActivo={esCiclo ? seleccion : null}
                                opacidadDe={opacidadDe}
                                onSeleccionar={alSeleccionar}
                                onCiclo={alSeleccionar}
                                onEntrar={alEntrar}
                                onSalir={alSalir}
                                onAvance={alAvanzar}
                            />
                        </div>

                        {tip && !editando && (
                            <RoadmapTip
                                tip={tip}
                                fijado={fijado}
                                tipRef={tipRef}
                                onCerrar={limpiar}
                            />
                        )}
                        {editando && (
                            <RoadmapAltas
                                guardando={guardando}
                                onPunto={() => setVerMarcador(true)}
                                onAgregar={(tipo) => crearEn(tipo)}
                            />
                        )}


                    </RoadmapMarco>
                </Card>

                <RoadmapModales
                    verFormulario={verFormulario}
                    verMarcador={verMarcador}
                    activo={activo}
                    tipo={tipoDe(activo)}
                    hitos={datos}
                    marcador={marcador}
                    guardando={guardando}
                    contenedor={pantallaCompleta ? () => marcoRef.current : null}
                    onGuardar={alGuardar}
                    onEliminar={alEliminar}
                    onElegirMarcador={elegirMarcador}
                    onCerrarFormulario={() => setVerFormulario(false)}
                    onCerrarMarcador={() => setVerMarcador(false)}
                />
            </div>
        </ConfigProvider>
    );
}
