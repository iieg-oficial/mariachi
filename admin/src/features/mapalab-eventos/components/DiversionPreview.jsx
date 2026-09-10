import { useEffect, useRef, useState } from 'react';
import { Button, Typography } from 'antd';
import { CloseOutlined, PlayCircleOutlined, RollbackOutlined } from '@ant-design/icons';
import { BRAND } from '@app/providers/brand';
import { ANIMACIONES } from '@features/mapalab-eventos/constants/diversion';
import { aguilas, aguilasAlCentro, limpiarVuelos, rebotar } from '@features/mapalab-eventos/helpers/diversionAnimaciones';
import { useMapaDePrueba } from '@features/mapalab-eventos/hooks/useMapaDePrueba';
import BotonEventoGlyph from './BotonEventoGlyph';

const { Text } = Typography;

const MENSAJE_TTL_MS = 10000;
const VIAJE_MS = 2600;
const CONTENEDOR = {
    display: 'flex',
    height: 220,
    overflow: 'hidden',
    borderRadius: 8,
    background: '#EEF2F4',
    border: '1px solid #F0F0F0',
};
const ESCENARIO = { position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden' };
const MAPA = { position: 'absolute', inset: 0, zIndex: 0 };
const TAMANOS = {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
    padding: '0 16px 12px',
    borderLeft: '1px solid #DCE3E7',
    background: 'rgba(255,255,255,.6)',
};
const TARJETA = {
    position: 'absolute',
    maxWidth: 250,
    background: '#FFFFFF',
    borderRadius: 10,
    boxShadow: '0 8px 28px rgba(0,0,0,.16)',
    padding: '8px 10px',
    fontSize: 12.5,
    lineHeight: 1.45,
    zIndex: 3,
};
const EN_ESQUINA = { ...TARJETA, right: 12, top: 12 };
const PINEADO = { ...TARJETA, left: '50%', bottom: 'calc(50% + 14px)', transform: 'translateX(-50%)', width: 'max-content' };
const FLECHA = {
    position: 'absolute',
    left: '50%',
    bottom: -5,
    width: 10,
    height: 10,
    background: '#FFFFFF',
    transform: 'translateX(-50%) rotate(45deg)',
};

const reducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function DiversionPreview({ animacion, funIcon, botonEstilo, facts }) {
    const escenarioRef = useRef(null);
    const mapaRef = useRef(null);
    const botonRef = useRef(null);
    const timersRef = useRef([]);
    const [siguiente, setSiguiente] = useState(0);
    const [mensaje, setMensaje] = useState(null);
    const { reiniciar, viajar, volver } = useMapaDePrueba(mapaRef);

    const datos = (facts || []).filter((f) => f?.text?.trim());
    const dato = datos.length ? datos[siguiente % datos.length] : null;
    const tipo = dato?.animacion || animacion || 'pelota';
    const conDestino = tipo === 'aguilas' && Boolean(dato?.destino);
    const simboloBoton = funIcon || dato?.symbol || null;
    const etiqueta = ANIMACIONES.find((a) => a.value === tipo)?.label || tipo;

    useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

    const programar = (fn, ms) => timersRef.current.push(setTimeout(fn, ms));

    const mostrar = (texto, pineado) => {
        setMensaje({ texto, pineado });
        if (!pineado) programar(() => setMensaje(null), MENSAJE_TTL_MS);
    };

    const probar = () => {
        const escenario = escenarioRef.current;
        if (!dato || !escenario || !botonRef.current) return;
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
        limpiarVuelos(escenario);
        setMensaje(null);
        reiniciar();
        const e = escenario.getBoundingClientRect();
        const b = botonRef.current.getBoundingClientRect();
        const origen = { x: b.left - e.left, y: b.top - e.top };
        const simbolo = dato.symbol || funIcon || null;
        setSiguiente((n) => n + 1);
        const sinMovimiento = reducido();
        if (conDestino) {
            if (!sinMovimiento) aguilasAlCentro(escenario, origen, simbolo, VIAJE_MS);
            viajar(dato.destino, sinMovimiento ? 0 : VIAJE_MS, () => mostrar(dato.text, true));
            programar(() => limpiarVuelos(escenario), VIAJE_MS + 700);
            return;
        }
        if (sinMovimiento) {
            mostrar(dato.text, false);
            return;
        }
        if (tipo === 'aguilas') aguilas(escenario, origen, simbolo);
        else rebotar(escenario, origen, simbolo);
        programar(() => mostrar(dato.text, false), tipo === 'aguilas' ? 1800 : 2600);
        programar(() => limpiarVuelos(escenario), 3900);
    };

    const regresar = () => {
        setMensaje(null);
        volver();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {dato ? `Siguiente: ${etiqueta}${conDestino ? ' → lugar' : ''}` : 'Agrega al menos un dato curioso para probar'}
                </Text>
                <Button size="small" icon={<PlayCircleOutlined />} onClick={probar} disabled={!dato}>
                    Probar
                </Button>
            </div>
            <div style={CONTENEDOR}>
                <div ref={escenarioRef} style={ESCENARIO}>
                    <div ref={mapaRef} style={MAPA} />
                    <button
                        ref={botonRef}
                        type="button"
                        onClick={probar}
                        aria-label="Probar el botón del evento"
                        style={{ position: 'absolute', left: 18, top: 70, padding: 0, border: 0, background: 'none', cursor: 'pointer', zIndex: 2 }}
                    >
                        <BotonEventoGlyph botonEstilo={botonEstilo} symbol={simboloBoton} size={20} />
                    </button>
                    {mensaje && (
                        <div style={mensaje.pineado ? PINEADO : EN_ESQUINA}>
                            <Text strong style={{ display: 'block', fontSize: 10.5, color: BRAND.orange, letterSpacing: '.06em' }}>DATO CURIOSO</Text>
                            {mensaje.texto}
                            {mensaje.pineado && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 6 }}>
                                        <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => setMensaje(null)} aria-label="Cerrar" />
                                        <Button size="small" icon={<RollbackOutlined />} onClick={regresar}>Volver</Button>
                                    </div>
                                    <span style={FLECHA} />
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div style={TAMANOS}>
                    {[40, 80].map((px) => (
                        <div key={px} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <BotonEventoGlyph botonEstilo={botonEstilo} symbol={simboloBoton} size={px} />
                            <Text type="secondary" style={{ fontSize: 11 }}>×{px / 20}</Text>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
