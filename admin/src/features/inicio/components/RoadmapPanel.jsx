import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Card, Space, Spin } from 'antd';
import { FlagOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import SectionHeader from '@shared/components/SectionHeader';
import { CICLOS, MARCADORES, PROCESOS } from '@features/inicio/constants/roadmapModelo';
import { acomodar } from '@features/inicio/helpers/roadmapLayout';
import {
    actualizarHito,
    crearHito,
    eliminarHito,
    getHitos,
} from '@features/inicio/api/roadmapService';
import RoadmapLienzo from '@features/inicio/components/roadmap/RoadmapLienzo';
import RoadmapEditor from '@features/inicio/components/roadmap/RoadmapEditor';
import RoadmapTip from '@features/inicio/components/roadmap/RoadmapTip';
import RoadmapAcciones from '@features/inicio/components/roadmap/RoadmapAcciones';

const PERMISO = 'mariachi.roadmap.manage';

export default function RoadmapPanel() {
    const { user } = useAuth();
    const { message } = App.useApp();
    const [datos, setDatos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [editando, setEditando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [marcador, setMarcador] = useState(MARCADORES[0]);
    const [seleccion, setSeleccion] = useState(null);
    const [fijado, setFijado] = useState(false);
    const [tip, setTip] = useState(null);
    const [pausado, setPausado] = useState(false);
    const [pantallaCompleta, setPantallaCompleta] = useState(false);
    const [verOcultos, setVerOcultos] = useState(false);
    const cajaRef = useRef(null);
    const marcoRef = useRef(null);
    const tipRef = useRef(null);
    const esperadoRef = useRef(-1);

    const puedeEditar = Boolean(user?.permissions?.includes?.(PERMISO));

    useEffect(() => {
        let cancelado = false;
        getHitos()
            .then((filas) => { if (!cancelado) setDatos(filas); })
            .catch(() => { if (!cancelado) setDatos([]); })
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, []);

    const hitos = useMemo(() => acomodar(datos), [datos]);

    const buscar = useCallback(
        (id) => [...datos, ...CICLOS, ...PROCESOS].find((item) => item.id === id) || null,
        [datos],
    );

    const activo = seleccion ? buscar(seleccion) : null;
    const esCiclo = Boolean(activo && activo.x0 != null);
    const familia = activo && !esCiclo ? (activo.de || activo.proy) : null;

    const relacionados = useMemo(() => {
        if (!activo || esCiclo) return new Set();
        const ids = new Set([activo.id]);
        datos.forEach((h) => {
            if ((h.de || h.proy) === familia) ids.add(h.id);
        });
        const sumarLinaje = (id) => {
            datos.forEach((h) => {
                if (h.id === id && h.naceDe && !ids.has(h.naceDe)) {
                    ids.add(h.naceDe);
                    sumarLinaje(h.naceDe);
                }
                if (h.naceDe === id && !ids.has(h.id)) {
                    ids.add(h.id);
                    sumarLinaje(h.id);
                }
            });
        };
        [...ids].forEach(sumarLinaje);
        return ids;
    }, [activo, esCiclo, familia, datos]);

    const seguirRef = useRef(true);

    const opacidadDe = useCallback((hito) => {
        const suyo = relacionados.has(hito.id);
        if (hito.tipo === 'feature' && !suyo) return verOcultos ? 0.45 : 0;
        if (!relacionados.size) return 1;
        return suyo ? 1 : 0.18;
    }, [relacionados, verOcultos]);

    const situarTip = (id, evento) => {
        const item = buscar(id);
        if (!item || !marcoRef.current) return;
        const marco = marcoRef.current.getBoundingClientRect();
        setTip({
            item,
            x: Math.min(Math.max(evento.clientX - marco.left + 14, 8), Math.max(8, marco.width - 336)),
            y: Math.max(8, evento.clientY - marco.top + 16),
        });
    };

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
        if (editando) return;
        if (evento) situarTip(id, evento);
        else setTip(null);
    };

    const alGuardar = async (valores) => {
        setGuardando(true);
        try {
            const guardado = await actualizarHito({ ...activo, ...valores });
            setDatos((previos) => previos.map((h) => (h.id === guardado.id ? guardado : h)));
            message.success('Hito actualizado');
            setSeleccion(null);
            setFijado(false);
        } catch {
            message.error('No se pudo guardar el hito');
        } finally {
            setGuardando(false);
        }
    };

    const alAgregar = async () => {
        setGuardando(true);
        const clave = `hito-${Date.now()}`;
        try {
            const creado = await crearHito({
                id: clave,
                txt: 'hito nuevo',
                proy: 'infra',
                tipo: 'mayor',
                f: new Date().toISOString().slice(0, 10),
                fecha: 'sin fecha',
                motivo: 'Sin describir todavía.',
            });
            setDatos((previos) => [...previos, creado]);
            setSeleccion(creado.id);
            setFijado(true);
            message.success('Hito creado');
        } catch {
            message.error('No se pudo crear el hito');
        } finally {
            setGuardando(false);
        }
    };

    const alEliminar = async (clave) => {
        try {
            await eliminarHito(clave);
            setDatos((previos) => previos.filter((h) => h.id !== clave));
            message.success('Hito eliminado');
            setSeleccion(null);
            setFijado(false);
        } catch {
            message.error('No se pudo eliminar el hito');
        }
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

    const alternarPausa = () => {
        seguirRef.current = pausado;
        setPausado((v) => !v);
    };

    const alternarPantalla = async () => {
        const marco = marcoRef.current;
        if (!marco) return;
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await marco.requestFullscreen();
        } catch {
            message.error('El navegador no permitió la pantalla completa');
        }
    };

    useEffect(() => {
        const alCambiar = () => setPantallaCompleta(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', alCambiar);
        return () => document.removeEventListener('fullscreenchange', alCambiar);
    }, []);

    const limpiar = useCallback(() => {
        setFijado(false);
        setSeleccion(null);
        setTip(null);
    }, []);

    useEffect(() => {
        if (!fijado) return undefined;
        const alClicFuera = (evento) => {
            if (tipRef.current?.contains(evento.target)) return;
            limpiar();
        };
        document.addEventListener('click', alClicFuera);
        return () => document.removeEventListener('click', alClicFuera);
    }, [fijado, limpiar]);


    return (
        <div>
            <SectionHeader
                icon={<FlagOutlined />}
                title="Hoja de ruta"
                subtitle="El ecosistema de 2024 a 2030"
                acciones={(
                    <RoadmapAcciones
                        verOcultos={verOcultos}
                        pausado={pausado}
                        pantallaCompleta={pantallaCompleta}
                        editando={editando}
                        puedeEditar={puedeEditar}
                        onVerOcultos={() => setVerOcultos((v) => !v)}
                        onPausa={alternarPausa}
                        onPantalla={alternarPantalla}
                        onEditar={() => { setEditando((v) => !v); limpiar(); }}
                    />
                )}
            />
            <Card size="small" styles={{ body: { padding: '6px 10px' } }}>
                {cargando && (
                    <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                )}
                <div ref={marcoRef} style={{ position: 'relative', display: cargando ? 'none' : 'block' }}>
                    <div
                        ref={cajaRef}
                        onScroll={alDesplazar}
                        style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
                    >
                        <RoadmapLienzo
                            hitos={hitos}
                            marcador={marcador}
                            seleccion={seleccion}
                            relacionados={relacionados}
                            pausado={pausado}
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
                </div>
            </Card>

            {editando && (
                <RoadmapEditor
                    hito={activo && activo.x0 == null ? activo : null}
                    marcador={marcador}
                    guardando={guardando}
                    onGuardar={alGuardar}
                    onEliminar={alEliminar}
                    onCerrar={limpiar}
                    onMarcador={setMarcador}
                    onAgregar={alAgregar}
                />
            )}
        </div>
    );
}
