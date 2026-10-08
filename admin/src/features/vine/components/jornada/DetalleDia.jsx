import { CloseOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import {
    Button, Empty, Space, Spin, Tag, Tooltip, Typography,
} from 'antd';
import { useEffect, useState } from 'react';

import { getDiaPersona } from '@features/vine/api/vineService';
import { EJE_TEXTO } from '@features/vine/constants';
import { COLOR_TINTA, SEGMENTOS_JORNADA, aMinutos, formatoMinutos } from '@features/vine/constants/jornada';
import { estiloTramo, fechaLarga, radiosDe } from '@features/vine/components/jornada/piezas';

const { Text } = Typography;

const NOMBRES = {
    ...Object.fromEntries(SEGMENTOS_JORNADA.map((s) => [s.clave, s.nombre.toLowerCase()])),
    tarde: 'no llegó a su hora',
    minimo: 'al menos',
    visita: 'visita corta',
};

const ALTO_BARRA = 30;
const ETIQUETA_MINIMA = 5.5;

const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const rangoDe = (tramos, oficiales, marcas) => {
    const puntos = [...tramos.flatMap(([, a, b]) => [a, b]), ...oficiales, ...marcas];
    if (!puntos.length) return [480, 1080];
    return [Math.floor((Math.min(...puntos) - 20) / 60) * 60, Math.ceil((Math.max(...puntos) + 20) / 60) * 60];
};

const DetalleDia = ({
    pin, d, horario, onAnterior, onSiguiente, onCerrar,
}) => {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let vigente = true;
        setCargando(true);
        getDiaPersona(pin, d.dia)
            .then((r) => { if (vigente) setDatos(r); })
            .catch(() => { if (vigente) setDatos(null); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [pin, d.dia]);

    const jornada = datos?.jornada ?? d;
    const tramos = jornada?.tramos ?? [];
    const oficiales = [horario?.entrada, horario?.salida].map(aMinutos).filter((v) => v != null);
    const marcas = (datos?.marcas ?? []).map((m) => ({ ...m, minuto: aMinutos(m.hora.slice(0, 5)) }));
    const rango = rangoDe(tramos, oficiales, marcas.map((m) => m.minuto));
    const pct = (m) => `${((m - rango[0]) / (rango[1] - rango[0])) * 100}%`;
    const ancho = (a, b) => ((b - a) / (rango[1] - rango[0])) * 100;
    const horas = [];
    for (let m = rango[0]; m <= rango[1]; m += 60) horas.push(m);

    const resumen = [
        horario?.entrada ? `${horario.entrada} a ${horario.salida}` : 'sin horario asignado',
        jornada?.entrada && `entró ${jornada.entrada}`,
        jornada?.salida ? `salió ${jornada.salida}` : jornada?.entrada && 'sin salida',
        jornada?.horas && formatoMinutos(jornada.horas * 60),
    ].filter(Boolean).join(' · ');

    return (
        <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', marginTop: 12, paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <span>
                    <Text strong>{fechaLarga(d.dia)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{` · ${resumen}`}</Text>
                </span>
                <Space size={0}>
                    <Button type="text" size="small" icon={<LeftOutlined />} onClick={onAnterior} disabled={!onAnterior} aria-label="Día anterior" />
                    <Button type="text" size="small" icon={<RightOutlined />} onClick={onSiguiente} disabled={!onSiguiente} aria-label="Día siguiente" />
                    <Button type="text" size="small" icon={<CloseOutlined />} onClick={onCerrar} aria-label="Cerrar" />
                </Space>
            </div>

            {cargando && <Spin size="small" />}
            {!cargando && !tramos.length && !marcas.length && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin marcas ese día" />
            )}
            {!cargando && (tramos.length > 0 || marcas.length > 0) && (
                <>
                    <div style={{ position: 'relative', height: 16 }}>
                        {horas.map((m) => (
                            <span key={m} style={{ ...EJE_TEXTO, position: 'absolute', left: pct(m), transform: 'translateX(-50%)' }}>
                                {hhmm(m).slice(0, 2)}
                            </span>
                        ))}
                    </div>
                    <div style={{ position: 'relative', height: ALTO_BARRA + 10 }}>
                        {horas.map((m) => (
                            <div key={m} style={{ position: 'absolute', left: pct(m), top: 0, bottom: 0, borderLeft: '1px solid rgba(0, 0, 0, 0.05)' }} />
                        ))}
                        {marcas.map((m) => (
                            <Tooltip key={m.hora + m.lector} title={`${m.hora} · ${m.direccion ?? 'sin dirección'} · ${m.lector}${m.cuenta ? '' : ' · no cuenta como marcaje'}`}>
                                <span style={{
                                    position: 'absolute', left: pct(m.minuto), top: -2, transform: 'translateX(-50%)', fontSize: 9, lineHeight: '10px', color: m.cuenta ? COLOR_TINTA : 'rgba(0, 0, 0, 0.25)', cursor: 'default',
                                }}
                                >
                                    {m.direccion === 'salida' ? '▲' : '▼'}
                                </span>
                            </Tooltip>
                        ))}
                        {tramos.map(([tipo, a, b], i) => {
                            const { inicio, fin } = radiosDe(tramos, i, 3);
                            return (
                                <Tooltip key={`${tipo}${a}`} title={`${NOMBRES[tipo] ?? tipo}: ${hhmm(a)} a ${hhmm(b)} · ${formatoMinutos(b - a)}`}>
                                    <div style={{
                                        position: 'absolute',
                                        top: 10,
                                        height: ALTO_BARRA,
                                        left: pct(a),
                                        width: `${Math.max(0.3, ancho(a, b))}%`,
                                        borderRadius: `${inicio}px ${fin}px ${fin}px ${inicio}px`,
                                        cursor: 'default',
                                        ...estiloTramo(tipo),
                                    }}
                                    />
                                </Tooltip>
                            );
                        })}
                        {oficiales.map((m) => (
                            <div key={m} style={{ position: 'absolute', left: pct(m), top: 4, bottom: -4, borderLeft: `1.5px dashed ${COLOR_TINTA}`, pointerEvents: 'none' }} />
                        ))}
                    </div>
                    <div style={{ position: 'relative', height: 30 }}>
                        {tramos.filter(([, a, b]) => ancho(a, b) >= ETIQUETA_MINIMA).map(([tipo, a, b]) => (
                            <span key={`${tipo}${a}`} style={{ position: 'absolute', left: pct(a), width: `${ancho(a, b)}%`, textAlign: 'center', lineHeight: '14px' }}>
                                <Text style={{ fontSize: 11, display: 'block' }} ellipsis>{NOMBRES[tipo] ?? tipo}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>{formatoMinutos(b - a)}</Text>
                            </span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        <Text type="secondary" style={{ fontSize: 12, marginRight: 4 }}>Marcas:</Text>
                        {marcas.map((m) => (
                            <Tag key={m.hora + m.lector} style={{ margin: 0, fontSize: 11, opacity: m.cuenta ? 1 : 0.5 }}>
                                {`${m.direccion === 'salida' ? '▲' : '▼'} ${m.hora.slice(0, 5)} · ${m.lector}`}
                            </Tag>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default DetalleDia;
