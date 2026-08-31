import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Card, Space, Spin, Typography } from 'antd';
import { SEMANTIC } from '@app/providers/brand';
import { EditOutlined, EyeInvisibleOutlined, EyeOutlined, FlagOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import SectionHeader from '@shared/components/SectionHeader';
import { CICLOS, MARCADORES, PROCESOS } from '@features/inicio/constants/roadmapModelo';
import { acomodar, colorDe, esMuerto } from '@features/inicio/helpers/roadmapLayout';
import {
    actualizarHito,
    crearHito,
    eliminarHito,
    getHitos,
} from '@features/inicio/api/roadmapService';
import RoadmapLienzo from '@features/inicio/components/roadmap/RoadmapLienzo';
import RoadmapEditor from '@features/inicio/components/roadmap/RoadmapEditor';

const { Text } = Typography;

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
    const [seguir, setSeguir] = useState(true);
    const [verOcultos, setVerOcultos] = useState(false);
    const cajaRef = useRef(null);
    const marcoRef = useRef(null);
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

    const opacidadDe = useCallback((hito) => {
        const suyo = (hito.de || hito.proy) === familia;
        if (hito.tipo === 'feature' && !suyo) return verOcultos ? 0.45 : 0;
        if (!familia) return 1;
        return suyo ? 1 : 0.18;
    }, [familia, verOcultos]);

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
            setFijado(false);
            setSeleccion(null);
            setTip(null);
            return;
        }
        setFijado(true);
        setSeleccion(id);
        if (evento && !editando) situarTip(id, evento);
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
                acciones={(
                    <Space size={6} wrap>
                        <Button
                            size="small"
                            icon={verOcultos ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            type={verOcultos ? 'primary' : 'default'}
                            onClick={(e) => { e.stopPropagation(); setVerOcultos((v) => !v); }}
                        >
                            {verOcultos ? 'Ocultar features' : 'Ver todos'}
                        </Button>
                        <Button
                            size="small"
                            type={seguir ? 'primary' : 'default'}
                            onClick={(e) => { e.stopPropagation(); setSeguir((v) => !v); }}
                        >
                            {seguir ? 'Siguiendo' : 'Scroll libre'}
                        </Button>
                        {puedeEditar && (
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                type={editando ? 'primary' : 'default'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditando((v) => !v);
                                    limpiar();
                                }}
                            >
                                {editando ? 'Salir de edición' : 'Editar'}
                            </Button>
                        )}
                    </Space>
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

                    {tip && !editando && (
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
